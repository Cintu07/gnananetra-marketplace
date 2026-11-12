import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { Settings } from "@/lib/settings-defaults";
import { razorpayLive, testPaymentsAllowed } from "@/lib/razorpay";

// The one place totals are worked out. The browser only ever sends product ids and
// quantities; every price comes from the database here.

export type CartLineInput = { productId: number; qty: number };

export type QuoteLine = {
  productId: number;
  slug: string;
  name: string;
  sku: string | null;
  image: string | null;
  unitPrice: number;
  mrp: number | null;
  qty: number;
  lineTotal: number;
  gstRate: number;
  hsn: string | null;
  sellerId: number | null;
  maxQty: number;
  problem: string | null; // set when the line cannot be bought as asked
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  discount: number;
  shippingFee: number;
  codFee: number;
  total: number;
  coupon: { code: string; applied: boolean; message: string } | null;
  codAvailable: boolean;
  onlineAvailable: boolean;
  freeShippingGap: number; // how much more to spend for free delivery, 0 if already free
  ok: boolean;
};

export async function priceCart(
  input: CartLineInput[],
  settings: Settings,
  opts: { couponCode?: string | null; paymentMethod?: "razorpay" | "cod" } = {},
): Promise<Quote> {
  const q = db;
  const wanted = new Map<number, number>();
  for (const line of input) {
    const qty = Math.floor(Number(line.qty));
    if (!Number.isInteger(line.productId) || !(qty > 0)) continue;
    wanted.set(line.productId, Math.min(99, (wanted.get(line.productId) ?? 0) + qty));
  }
  const ids = [...wanted.keys()].slice(0, 50);
  const products = ids.length ? await q.select().from(s.products).where(inArray(s.products.id, ids)) : [];
  const images = ids.length
    ? await q.select({ productId: s.productImages.productId, url: s.productImages.url, sort: s.productImages.sort }).from(s.productImages).where(inArray(s.productImages.productId, ids))
    : [];
  const sellerIds = [...new Set(products.map((p) => p.sellerId).filter((x): x is number => x !== null))];
  const sellerRows = sellerIds.length ? await q.select({ id: s.sellers.id, status: s.sellers.status, commissionPct: s.sellers.commissionPct }).from(s.sellers).where(inArray(s.sellers.id, sellerIds)) : [];
  const sellerById = new Map(sellerRows.map((r) => [r.id, r]));
  const firstImage = new Map<number, string>();
  for (const img of images.sort((a, b) => a.sort - b.sort)) if (!firstImage.has(img.productId)) firstImage.set(img.productId, img.url);

  const lines: QuoteLine[] = [];
  for (const id of ids) {
    const p = products.find((x) => x.id === id);
    if (!p) continue;
    const qty = wanted.get(id)!;
    let problem: string | null = null;
    let maxQty = Math.min(99, p.maxPerOrder ?? 99);
    if (p.stockQty !== null) maxQty = Math.min(maxQty, Math.max(0, p.stockQty));
    if (p.status !== "published" || (p.sellerId !== null && sellerById.get(p.sellerId)?.status !== "approved")) problem = "No longer available";
    else if (p.stockStatus === "out_of_stock" || maxQty === 0) problem = "Out of stock";
    else if (qty > maxQty) problem = `Only ${maxQty} available`;
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      image: firstImage.get(p.id) ?? null,
      unitPrice: p.price,
      mrp: p.mrp,
      qty,
      lineTotal: p.price * qty,
      gstRate: p.gstRate,
      hsn: p.hsn,
      sellerId: p.sellerId,
      maxQty,
      problem,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + Math.max(l.mrp ?? 0, l.unitPrice) * l.qty, 0);

  let discount = 0;
  let coupon: Quote["coupon"] = null;
  const code = opts.couponCode?.trim().toUpperCase();
  if (code) {
    const [c] = await q.select().from(s.coupons).where(inArray(s.coupons.code, [code]));
    const now = Date.now();
    if (!c || !c.isActive) coupon = { code, applied: false, message: "This code is not valid" };
    else if (c.startsAt && c.startsAt.getTime() > now) coupon = { code, applied: false, message: "This code is not active yet" };
    else if (c.endsAt && c.endsAt.getTime() < now) coupon = { code, applied: false, message: "This code has expired" };
    else if (c.usageLimit !== null && c.usedCount >= c.usageLimit) coupon = { code, applied: false, message: "This code has been used up" };
    else if (subtotal < c.minSubtotal)
      coupon = { code, applied: false, message: `Add items worth ₹${Math.ceil((c.minSubtotal - subtotal) / 100).toLocaleString("en-IN")} more to use this code` };
    else {
      discount = c.type === "percent" ? Math.round((subtotal * Math.min(100, c.value)) / 100) : c.value;
      if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
      discount = Math.min(discount, subtotal);
      coupon = { code, applied: true, message: c.description || "Code applied" };
    }
  }

  const afterDiscount = subtotal - discount;
  const freeShip = afterDiscount >= settings.shipping.freeShippingMin;
  const shippingFee = lines.length === 0 || freeShip ? 0 : settings.shipping.flatFee;
  const preCod = afterDiscount + shippingFee;
  const codAvailable = settings.payments.codEnabled && (settings.payments.codMaxOrder === 0 || preCod <= settings.payments.codMaxOrder);
  const codFee = opts.paymentMethod === "cod" && codAvailable ? settings.payments.codFee : 0;

  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    mrpTotal,
    discount,
    shippingFee,
    codFee,
    total: preCod + codFee,
    coupon,
    codAvailable,
    // online only when it can really be paid: live Razorpay keys, or test payments in dev or preview
    onlineAvailable: settings.payments.onlineEnabled && (razorpayLive() || testPaymentsAllowed()),
    freeShippingGap: freeShip || settings.shipping.flatFee === 0 ? 0 : settings.shipping.freeShippingMin - afterDiscount,
    ok: lines.length > 0 && lines.every((l) => !l.problem),
  };
}
