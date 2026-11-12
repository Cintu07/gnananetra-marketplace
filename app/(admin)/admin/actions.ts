"use server";

import { updateTag } from "next/cache";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { chunks, db, runBatch, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { cleanHtml, noDashes, slugify } from "@/lib/sanitize";
import { hashPassword } from "@/lib/password";
import { backInStockEmail } from "@/lib/email";
import { markPaid, refundOrder, setOrderStatus } from "@/lib/orders";
import { fetchOrderPayments } from "@/lib/razorpay";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { ORDER_STATUSES } from "@/lib/site";

export type Result<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

const fail = (e: unknown): Result => {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the form" };
  if (e instanceof Error && /unique|duplicate/i.test(e.message)) return { ok: false, error: "That name, code or address is already used by another record" };
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Something went wrong" };
};

const nullable = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const money = z.number().int().min(0).max(1_000_000_000);

async function uniqueSlug(table: typeof s.products | typeof s.categories | typeof s.brands | typeof s.pages, base: string, exceptId?: number) {
  const root = slugify(base) || "item";
  let slug = root;
  for (let n = 2; n < 200; n++) {
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(exceptId ? and(eq(table.slug, slug), ne(table.id, exceptId)) : eq(table.slug, slug));
    if (!rows.length) return slug;
    slug = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

// ---------------------------------------------------------------- products

const productInput = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2, "Product name is required").max(250),
  slug: z.string().trim().max(120).optional(),
  sku: nullable(80),
  brandId: z.number().int().nullable(),
  categoryIds: z.array(z.number().int()).max(20),
  status: z.enum(["published", "draft", "archived"]),
  price: money.min(1, "Set a selling price"),
  mrp: money.nullable(),
  costPrice: money.nullable(),
  stockStatus: z.enum(["in_stock", "out_of_stock", "preorder"]),
  stockQty: z.number().int().min(0).max(1_000_000).nullable(),
  lowStockAt: z.number().int().min(0).max(100000),
  maxPerOrder: z.number().int().min(1).max(999).nullable(),
  highlights: z.array(z.string().trim().max(300)).max(20),
  specs: z.array(z.object({ title: z.string().trim().max(120), rows: z.array(z.tuple([z.string().trim().max(160), z.string().trim().max(1000)])).max(150) })).max(30),
  descriptionHtml: z.string().max(200_000),
  badge: nullable(40),
  isFeatured: z.boolean(),
  isDeal: z.boolean(),
  dealEndsAt: z.string().nullable(),
  dealQuantity: z.number().int().min(0).nullable(),
  gstRate: z.number().int().refine((v) => [0, 3, 5, 12, 18, 28, 40].includes(v), "Pick a valid GST rate"),
  hsn: nullable(12),
  warranty: nullable(120),
  weightKg: z.number().min(0).max(5000).nullable(),
  seoTitle: nullable(120),
  seoDescription: nullable(300),
  images: z.array(z.object({ url: z.string().min(1), alt: z.string().max(200).nullable(), width: z.number().nullable(), height: z.number().nullable() })).max(20),
});
export type ProductInput = z.infer<typeof productInput>;

async function sendBackInStock(productId: number) {
  const [p] = await db.select({ name: s.products.name, slug: s.products.slug, status: s.products.status, stockStatus: s.products.stockStatus }).from(s.products).where(eq(s.products.id, productId));
  if (!p || p.status !== "published" || p.stockStatus === "out_of_stock") return 0;
  const waiting = await db.select().from(s.stockAlerts).where(and(eq(s.stockAlerts.productId, productId), isNull(s.stockAlerts.notifiedAt)));
  for (const w of waiting) await backInStockEmail(w.email, p);
  if (waiting.length) await db.update(s.stockAlerts).set({ notifiedAt: new Date() }).where(and(eq(s.stockAlerts.productId, productId), isNull(s.stockAlerts.notifiedAt)));
  return waiting.length;
}

export async function saveProduct(raw: ProductInput): Promise<Result<{ id: number; slug: string }>> {
  const admin = await requireAdmin();
  try {
    const d = productInput.parse(raw);
    if (d.mrp !== null && d.mrp > 0 && d.mrp < d.price) throw new Error("MRP should be higher than the selling price (or leave it empty)");
    const slug = await uniqueSlug(s.products, d.slug || d.name, d.id);
    const before = d.id ? (await db.select({ stockStatus: s.products.stockStatus }).from(s.products).where(eq(s.products.id, d.id)))[0] : null;
    let stockStatus = d.stockStatus;
    if (d.stockQty !== null && d.stockQty === 0 && stockStatus === "in_stock") stockStatus = "out_of_stock";
    if (d.stockQty !== null && d.stockQty > 0 && stockStatus === "out_of_stock") stockStatus = "in_stock";
    const values = {
      name: noDashes(d.name),
      slug,
      sku: d.sku,
      brandId: d.brandId,
      status: d.status,
      price: d.price,
      mrp: d.mrp || null,
      costPrice: d.costPrice || null,
      stockStatus,
      stockQty: d.stockQty,
      lowStockAt: d.lowStockAt,
      maxPerOrder: d.maxPerOrder,
      highlights: d.highlights.filter(Boolean).map(noDashes),
      specs: d.specs
        .map((g) => ({ title: noDashes(g.title || "Specifications"), rows: g.rows.filter(([k, v]) => k && v).map(([k, v]) => [noDashes(k), noDashes(v)]) as [string, string][] }))
        .filter((g) => g.rows.length),
      descriptionHtml: cleanHtml(d.descriptionHtml),
      badge: d.badge && noDashes(d.badge),
      isFeatured: d.isFeatured,
      isDeal: d.isDeal,
      dealEndsAt: d.dealEndsAt ? new Date(d.dealEndsAt) : null,
      dealQuantity: d.dealQuantity,
      gstRate: d.gstRate,
      hsn: d.hsn,
      warranty: d.warranty && noDashes(d.warranty),
      weightKg: d.weightKg,
      seoTitle: d.seoTitle && noDashes(d.seoTitle),
      seoDescription: d.seoDescription && noDashes(d.seoDescription),
      updatedAt: new Date(),
    };
    let id = d.id;
    if (!id) [{ id }] = await db.insert(s.products).values(values).returning({ id: s.products.id });
    const pid = id!;
    // details, photos and categories change together (one D1 batch: all or nothing);
    // one statement per photo keeps each under D1's 100 values per statement
    await runBatch([
      d.id ? db.update(s.products).set(values).where(eq(s.products.id, pid)) : db.update(s.products).set({ updatedAt: new Date() }).where(eq(s.products.id, pid)),
      db.delete(s.productImages).where(eq(s.productImages.productId, pid)),
      ...d.images.map((img, i) => db.insert(s.productImages).values({ productId: pid, url: img.url, alt: img.alt, width: img.width, height: img.height, sort: i })),
      db.delete(s.productCategories).where(eq(s.productCategories.productId, pid)),
      ...[...new Set(d.categoryIds)].map((categoryId) => db.insert(s.productCategories).values({ productId: pid, categoryId })),
    ]);
    let notified = 0;
    if (before?.stockStatus === "out_of_stock" && stockStatus !== "out_of_stock") notified = await sendBackInStock(pid);
    await logActivity(admin, d.id ? "update" : "create", "product", pid, `${d.id ? "Updated" : "Created"} product “${d.name}”`);
    updateTag("catalog");
    return { ok: true, data: { id: pid, slug }, message: notified ? `Saved. ${notified} waiting shopper${notified > 1 ? "s were" : " was"} emailed that it's back.` : "Saved" };
  } catch (e) {
    return fail(e) as Result<{ id: number; slug: string }>;
  }
}

const quickPatch = z.object({
  price: money.min(1).optional(),
  mrp: money.nullable().optional(),
  stockStatus: z.enum(["in_stock", "out_of_stock", "preorder"]).optional(),
  stockQty: z.number().int().min(0).nullable().optional(),
  status: z.enum(["published", "draft", "archived"]).optional(),
  isFeatured: z.boolean().optional(),
  isDeal: z.boolean().optional(),
});

export async function quickUpdateProduct(id: number, patch: z.infer<typeof quickPatch>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = quickPatch.parse(patch);
    const [before] = await db.select().from(s.products).where(eq(s.products.id, id));
    if (!before) throw new Error("Product not found");
    const next: Record<string, unknown> = { ...d, updatedAt: new Date() };
    if (d.stockQty !== undefined && d.stockQty !== null) next.stockStatus = d.stockQty > 0 ? (before.stockStatus === "preorder" ? "preorder" : "in_stock") : "out_of_stock";
    await db.update(s.products).set(next).where(eq(s.products.id, id));
    const after = (next.stockStatus as string | undefined) ?? before.stockStatus;
    let notified = 0;
    if (before.stockStatus === "out_of_stock" && after !== "out_of_stock") notified = await sendBackInStock(id);
    await logActivity(admin, "update", "product", id, `Quick edit on “${before.name}”: ${Object.keys(d).join(", ")}`);
    updateTag("catalog");
    return { ok: true, message: notified ? `Updated. ${notified} shopper(s) emailed.` : "Updated" };
  } catch (e) {
    return fail(e);
  }
}

/** Inventory screen: set unit counts for many products at once. null = stop counting. */
export async function saveInventory(changes: { id: number; stockQty: number | null }[]): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const list = z.array(z.object({ id: z.number().int(), stockQty: z.number().int().min(0).max(1_000_000).nullable() })).max(1000).parse(changes);
    let notified = 0;
    for (const c of list) {
      const [before] = await db.select({ stockStatus: s.products.stockStatus }).from(s.products).where(eq(s.products.id, c.id));
      if (!before) continue;
      const stockStatus = c.stockQty === null ? before.stockStatus : c.stockQty === 0 ? "out_of_stock" : before.stockStatus === "preorder" ? "preorder" : "in_stock";
      await db.update(s.products).set({ stockQty: c.stockQty, stockStatus, updatedAt: new Date() }).where(eq(s.products.id, c.id));
      if (before.stockStatus === "out_of_stock" && stockStatus !== "out_of_stock") notified += await sendBackInStock(c.id);
    }
    await logActivity(admin, "update", "inventory", null, `Updated unit counts for ${list.length} product(s)`);
    updateTag("catalog");
    return { ok: true, message: `Saved ${list.length} product(s)${notified ? `, ${notified} shopper(s) emailed` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

export async function bulkProducts(ids: number[], action: "publish" | "draft" | "archive" | "in_stock" | "out_of_stock" | "feature" | "unfeature" | "delete"): Promise<Result> {
  const admin = await requireAdmin();
  try {
    if (!ids.length) throw new Error("Select at least one product");
    if (action === "delete") {
      // products that appear in orders are archived instead, so order history stays intact
      const usedIds = new Set<number>();
      for (const part of chunks(ids)) {
        const used = await db.selectDistinct({ id: s.orderItems.productId }).from(s.orderItems).where(inArray(s.orderItems.productId, part));
        for (const u of used) if (u.id !== null) usedIds.add(u.id);
      }
      const deletable = ids.filter((i) => !usedIds.has(i));
      for (const part of chunks(deletable)) await db.delete(s.products).where(inArray(s.products.id, part));
      for (const part of chunks([...usedIds])) await db.update(s.products).set({ status: "archived" }).where(inArray(s.products.id, part));
      await logActivity(admin, "delete", "product", null, `Deleted ${deletable.length} product(s), archived ${usedIds.size} that have orders`);
    } else {
      const set: Record<string, unknown> = {
        publish: { status: "published" },
        draft: { status: "draft" },
        archive: { status: "archived" },
        in_stock: { stockStatus: "in_stock" },
        out_of_stock: { stockStatus: "out_of_stock" },
        feature: { isFeatured: true },
        unfeature: { isFeatured: false },
      }[action];
      for (const part of chunks(ids)) await db.update(s.products).set({ ...set, updatedAt: new Date() }).where(inArray(s.products.id, part));
      if (action === "in_stock") for (const id of ids) await sendBackInStock(id);
      await logActivity(admin, "bulk", "product", null, `Bulk “${action}” on ${ids.length} product(s)`);
    }
    updateTag("catalog");
    return { ok: true, message: "Done" };
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateProduct(id: number): Promise<Result<{ id: number }>> {
  const admin = await requireAdmin();
  try {
    const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
    if (!p) throw new Error("Product not found");
    const { id: _omit, createdAt: _c, ...rest } = p;
    void _omit;
    void _c;
    const slug = await uniqueSlug(s.products, `${p.slug}-copy`);
    const [row] = await db
      .insert(s.products)
      .values({ ...rest, name: `${p.name} (copy)`, slug, status: "draft", totalSales: 0, ratingAvg: 0, ratingCount: 0, wpId: null, updatedAt: new Date() })
      .returning({ id: s.products.id });
    const imgs = await db.select().from(s.productImages).where(eq(s.productImages.productId, id));
    for (const { id: _i, ...img } of imgs) await db.insert(s.productImages).values({ ...img, productId: row.id });
    const cats = await db.select().from(s.productCategories).where(eq(s.productCategories.productId, id));
    for (const c of cats) await db.insert(s.productCategories).values({ ...c, productId: row.id });
    await logActivity(admin, "create", "product", row.id, `Duplicated “${p.name}”`);
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e) as Result<{ id: number }>;
  }
}

// ---------------------------------------------------------------- categories, brands

const categoryInput = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: z.string().trim().max(120).optional(),
  parentId: z.number().int().nullable(),
  description: nullable(2000),
  image: nullable(1000),
  sort: z.number().int().min(-1000).max(1000),
  isVisible: z.boolean(),
});

export async function saveCategory(raw: z.infer<typeof categoryInput>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = categoryInput.parse(raw);
    if (d.id && d.parentId === d.id) throw new Error("A category cannot be inside itself");
    const slug = await uniqueSlug(s.categories, d.slug || d.name, d.id);
    const values = { name: noDashes(d.name), slug, parentId: d.parentId, description: d.description && noDashes(d.description), image: d.image, sort: d.sort, isVisible: d.isVisible, updatedAt: new Date() };
    if (d.id) await db.update(s.categories).set(values).where(eq(s.categories.id, d.id));
    else await db.insert(s.categories).values(values);
    await logActivity(admin, d.id ? "update" : "create", "category", d.id ?? slug, `${d.id ? "Updated" : "Created"} category “${d.name}”`);
    updateTag("catalog");
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategory(id: number): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const [c] = await db.select().from(s.categories).where(eq(s.categories.id, id));
    if (!c) throw new Error("Not found");
    await db.update(s.categories).set({ parentId: c.parentId }).where(eq(s.categories.parentId, id));
    await db.delete(s.categories).where(eq(s.categories.id, id));
    await logActivity(admin, "delete", "category", id, `Deleted category “${c.name}” (its products stay, sub-categories moved up)`);
    updateTag("catalog");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const brandInput = z.object({ id: z.number().int().optional(), name: z.string().trim().min(1).max(120), slug: z.string().trim().max(120).optional(), logo: nullable(1000), isVisible: z.boolean(), sort: z.number().int() });

export async function saveBrand(raw: z.infer<typeof brandInput>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = brandInput.parse(raw);
    const slug = await uniqueSlug(s.brands, d.slug || d.name, d.id);
    const values = { name: d.name, slug, logo: d.logo, isVisible: d.isVisible, sort: d.sort };
    if (d.id) await db.update(s.brands).set(values).where(eq(s.brands.id, d.id));
    else await db.insert(s.brands).values(values);
    await logActivity(admin, d.id ? "update" : "create", "brand", d.id ?? slug, `Saved brand “${d.name}”`);
    updateTag("catalog");
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBrand(id: number): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await db.delete(s.brands).where(eq(s.brands.id, id));
    await logActivity(admin, "delete", "brand", id, "Deleted a brand (its products are kept without a brand)");
    updateTag("catalog");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------- orders

export async function updateOrderStatus(
  id: number,
  status: string,
  extra: { trackingCarrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; notify?: boolean } = {},
): Promise<Result> {
  const admin = await requireAdmin();
  try {
    if (!(ORDER_STATUSES as readonly string[]).includes(status)) throw new Error("Unknown status");
    if (status === "shipped" && !extra.trackingNumber) {
      const [o] = await db.select({ t: s.orders.trackingNumber }).from(s.orders).where(eq(s.orders.id, id));
      if (!o?.t) throw new Error("Add the courier and tracking number before marking as shipped");
    }
    if (extra.trackingUrl && !/^https?:\/\//.test(extra.trackingUrl)) throw new Error("Tracking link should start with https://");
    await setOrderStatus(id, status, { name: admin.name || admin.email || "admin" }, extra);
    await logActivity(admin, "status", "order", id, `Order status → ${status}`);
    updateTag("catalog");
    return { ok: true, message: extra.notify === false ? "Updated" : "Updated and customer notified" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveTracking(id: number, t: { trackingCarrier: string | null; trackingNumber: string | null; trackingUrl: string | null }): Promise<Result> {
  const admin = await requireAdmin();
  try {
    if (t.trackingUrl && !/^https?:\/\//.test(t.trackingUrl)) throw new Error("Tracking link should start with https://");
    await db.update(s.orders).set({ ...t, updatedAt: new Date() }).where(eq(s.orders.id, id));
    await logActivity(admin, "update", "order", id, "Updated tracking details");
    return { ok: true, message: "Tracking saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function addOrderNote(id: number, message: string, customerVisible: boolean): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const text = z.string().trim().min(1, "Write a note").max(2000).parse(message);
    await db.insert(s.orderEvents).values({ orderId: id, kind: "note", message: text, actor: admin.name || admin.email, isCustomerVisible: customerVisible });
    return { ok: true, message: "Note added" };
  } catch (e) {
    return fail(e);
  }
}

export async function refundOrderAction(id: number, amount: number, reason: string): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await refundOrder(id, Math.round(amount), reason.trim().slice(0, 300), { name: admin.name || admin.email || "admin" });
    await logActivity(admin, "refund", "order", id, `Refunded ₹${(amount / 100).toLocaleString("en-IN")}`);
    updateTag("catalog");
    return { ok: true, message: "Refund recorded" };
  } catch (e) {
    return fail(e);
  }
}

/** For online orders stuck as "awaiting payment": ask Razorpay whether money actually came in. */
export async function checkPayment(id: number): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const [o] = await db.select().from(s.orders).where(eq(s.orders.id, id));
    if (!o?.razorpayOrderId) throw new Error("This order has no online payment attached");
    const payments = await fetchOrderPayments(o.razorpayOrderId);
    const captured = payments.find((p) => p.status === "captured");
    if (!captured) return { ok: true, message: payments.length ? `No successful payment yet (${payments.map((p) => p.status).join(", ")})` : "Razorpay has no payment for this order yet" };
    await markPaid(id, captured.id, `checked by ${admin.name || admin.email}`);
    return { ok: true, message: "Payment found and order confirmed" };
  } catch (e) {
    return fail(e);
  }
}

export async function markCodCollected(id: number): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await db.update(s.orders).set({ paymentStatus: "paid", paidAt: new Date(), updatedAt: new Date() }).where(and(eq(s.orders.id, id), eq(s.orders.paymentMethod, "cod")));
    await db.insert(s.orderEvents).values({ orderId: id, kind: "paid", message: "Cash collected.", actor: admin.name || admin.email });
    await logActivity(admin, "update", "order", id, "Marked COD cash as collected");
    return { ok: true, message: "Marked as paid" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------- customers

export async function updateCustomer(id: number, patch: { name?: string; phone?: string | null; notes?: string | null; tags?: string[]; isBlocked?: boolean }): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = z
      .object({
        name: z.string().trim().max(120).optional(),
        phone: nullable(20).optional(),
        notes: nullable(4000).optional(),
        tags: z.array(z.string().trim().max(30)).max(12).optional(),
        isBlocked: z.boolean().optional(),
      })
      .parse(patch);
    const [u] = await db.select({ role: s.users.role }).from(s.users).where(eq(s.users.id, id));
    if (u && u.role !== "customer" && d.isBlocked) throw new Error("Staff accounts are managed under Team");
    await db.update(s.users).set(d).where(eq(s.users.id, id));
    await logActivity(admin, "update", "customer", id, `Updated customer${d.isBlocked !== undefined ? (d.isBlocked ? " (blocked)" : " (unblocked)") : ""}`);
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------- coupons

const couponInput = z.object({
  id: z.number().int().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3 to 30 letters, numbers, - or _"),
  description: nullable(200),
  type: z.enum(["percent", "flat"]),
  value: z.number().int().min(1, "Enter the discount"),
  minSubtotal: money,
  maxDiscount: money.nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  usageLimit: z.number().int().min(1).nullable(),
  isActive: z.boolean(),
});

export async function saveCoupon(raw: z.infer<typeof couponInput>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = couponInput.parse(raw);
    if (d.type === "percent" && d.value > 100) throw new Error("A percentage can't be more than 100");
    const values = { ...d, id: undefined, startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt) : null };
    if (d.id) await db.update(s.coupons).set(values).where(eq(s.coupons.id, d.id));
    else await db.insert(s.coupons).values(values);
    await logActivity(admin, d.id ? "update" : "create", "coupon", d.code, `Saved coupon ${d.code}`);
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCoupon(id: number): Promise<Result> {
  const admin = await requireAdmin();
  await db.delete(s.coupons).where(eq(s.coupons.id, id));
  await logActivity(admin, "delete", "coupon", id, "Deleted a coupon");
  return { ok: true };
}

// ---------------------------------------------------------------- inbox

export async function updateInquiry(id: number, patch: { status?: string; adminNote?: string | null }): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = z.object({ status: z.enum(["new", "in_progress", "resolved", "spam"]).optional(), adminNote: nullable(4000).optional() }).parse(patch);
    await db.update(s.inquiries).set({ ...d, updatedAt: new Date() }).where(eq(s.inquiries.id, id));
    await logActivity(admin, "update", "inquiry", id, `Inquiry ${d.status ? `→ ${d.status}` : "note updated"}`);
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

async function refreshRating(productId: number) {
  await db.run(sql`
    update products set
      rating_avg = coalesce((select avg(rating) from reviews where product_id = ${productId} and status = 'approved'), 0),
      rating_count = (select count(*) from reviews where product_id = ${productId} and status = 'approved')
    where id = ${productId}`);
}

export async function moderateReview(id: number, status: "approved" | "rejected" | "pending", adminReply?: string | null): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const [r] = await db
      .update(s.reviews)
      .set({ status, ...(adminReply !== undefined ? { adminReply: adminReply?.trim() || null } : {}) })
      .where(eq(s.reviews.id, id))
      .returning({ productId: s.reviews.productId });
    if (r) await refreshRating(r.productId);
    await logActivity(admin, "moderate", "review", id, `Review ${status}`);
    updateTag("catalog");
    return { ok: true, message: status === "approved" ? "Approved and published" : status === "rejected" ? "Hidden from the shop" : "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteReview(id: number): Promise<Result> {
  const admin = await requireAdmin();
  const [r] = await db.delete(s.reviews).where(eq(s.reviews.id, id)).returning({ productId: s.reviews.productId });
  if (r) await refreshRating(r.productId);
  await logActivity(admin, "delete", "review", id, "Deleted a review");
  updateTag("catalog");
  return { ok: true };
}

export async function notifyStockAlerts(productId: number): Promise<Result> {
  const admin = await requireAdmin();
  const n = await sendBackInStock(productId);
  await logActivity(admin, "notify", "product", productId, `Sent ${n} back-in-stock email(s)`);
  return n ? { ok: true, message: `Emailed ${n} shopper(s)` } : { ok: false, error: "Nothing sent: the product must be published and in stock, with people waiting" };
}

export async function deleteStockAlert(id: number): Promise<Result> {
  await requireAdmin();
  await db.delete(s.stockAlerts).where(eq(s.stockAlerts.id, id));
  return { ok: true };
}

// ---------------------------------------------------------------- website content

const bannerInput = z.object({
  id: z.number().int().optional(),
  placement: z.enum(["hero", "promo"]),
  eyebrow: nullable(60),
  title: z.string().trim().min(2, "Add a headline").max(140),
  subtitle: nullable(300),
  ctaLabel: nullable(40),
  ctaHref: nullable(300).refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "Link should start with / or https://"),
  image: nullable(1000),
  theme: z.enum(["dark", "brand", "light"]),
  sort: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});

export async function saveBanner(raw: z.infer<typeof bannerInput>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const d = bannerInput.parse(raw);
    const values = {
      ...d,
      id: undefined,
      eyebrow: d.eyebrow && noDashes(d.eyebrow),
      title: noDashes(d.title),
      subtitle: d.subtitle && noDashes(d.subtitle),
      ctaLabel: d.ctaLabel && noDashes(d.ctaLabel),
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
    };
    if (d.id) await db.update(s.banners).set(values).where(eq(s.banners.id, d.id));
    else await db.insert(s.banners).values(values);
    await logActivity(admin, d.id ? "update" : "create", "banner", d.id ?? null, `Saved banner “${d.title}”`);
    updateTag("content");
    return { ok: true, message: "Saved. It's live on the homepage." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBanner(id: number): Promise<Result> {
  const admin = await requireAdmin();
  await db.delete(s.banners).where(eq(s.banners.id, id));
  await logActivity(admin, "delete", "banner", id, "Deleted a banner");
  updateTag("content");
  return { ok: true };
}

const pageInput = z.object({
  id: z.number().int().optional(),
  title: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(80).optional(),
  contentHtml: z.string().max(300_000),
  seoDescription: nullable(300),
  isPublished: z.boolean(),
  showInFooter: z.boolean(),
  sort: z.number().int(),
});

const RESERVED = new Set(["admin", "api", "shop", "category", "brand", "product", "cart", "checkout", "account", "login", "order", "invoice", "track", "deals", "wishlist", "compare", "contact", "store-location", "forgot-password", "reset-password", "uploads", "catalog", "brand"]);

export async function savePage(raw: z.infer<typeof pageInput>): Promise<Result<{ id: number }>> {
  const admin = await requireAdmin();
  try {
    const d = pageInput.parse(raw);
    const base = slugify(d.slug || d.title);
    if (RESERVED.has(base)) throw new Error(`“/${base}” is used by the shop itself. Pick another address.`);
    const slug = await uniqueSlug(s.pages, base, d.id);
    const values = { title: noDashes(d.title), slug, contentHtml: cleanHtml(d.contentHtml), seoDescription: d.seoDescription && noDashes(d.seoDescription), isPublished: d.isPublished, showInFooter: d.showInFooter, sort: d.sort, updatedAt: new Date() };
    let id = d.id;
    if (id) await db.update(s.pages).set(values).where(eq(s.pages.id, id));
    else [{ id }] = await db.insert(s.pages).values(values).returning({ id: s.pages.id });
    await logActivity(admin, d.id ? "update" : "create", "page", id!, `Saved page “${d.title}”`);
    updateTag("content");
    return { ok: true, data: { id: id! }, message: "Saved" };
  } catch (e) {
    return fail(e) as Result<{ id: number }>;
  }
}

export async function deletePage(id: number): Promise<Result> {
  const admin = await requireAdmin();
  await db.delete(s.pages).where(eq(s.pages.id, id));
  await logActivity(admin, "delete", "page", id, "Deleted a page");
  updateTag("content");
  return { ok: true };
}

// ---------------------------------------------------------------- settings, team

export async function saveSettings(section: keyof typeof DEFAULT_SETTINGS, value: Record<string, unknown>): Promise<Result> {
  const admin = await requireAdmin({ owner: true });
  try {
    if (!(section in DEFAULT_SETTINGS)) throw new Error("Unknown settings section");
    // keep only known keys, typed like the defaults
    const defaults = DEFAULT_SETTINGS[section] as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(defaults)) {
      if (!(k in value)) continue;
      const v = value[k];
      if (typeof def === "number") clean[k] = Math.max(0, Math.round(Number(v) || 0));
      else if (typeof def === "boolean") clean[k] = Boolean(v);
      else if (typeof def === "string") clean[k] = String(v ?? "").slice(0, 2000);
      else clean[k] = v;
    }
    await db
      .insert(s.settings)
      .values({ key: section, value: clean })
      .onConflictDoUpdate({ target: s.settings.key, set: { value: sql`json_patch(${s.settings.value}, ${JSON.stringify(clean)})`, updatedAt: new Date() } });
    await logActivity(admin, "update", "settings", section, `Changed ${section} settings`);
    updateTag("settings");
    return { ok: true, message: "Settings saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveStaff(raw: { id?: number; email: string; name: string; role: "admin" | "staff"; password?: string }): Promise<Result> {
  const admin = await requireAdmin({ owner: true });
  try {
    const d = z
      .object({
        id: z.number().int().optional(),
        email: z.email().transform((v) => v.toLowerCase()),
        name: z.string().trim().min(2).max(120),
        role: z.enum(["admin", "staff"]),
        password: z.string().min(10, "Use at least 10 characters for staff passwords").max(200).optional().or(z.literal("").transform(() => undefined)),
      })
      .parse(raw);
    if (d.id === admin.id && d.role !== "admin") throw new Error("You can't remove your own owner access");
    const passwordHash = d.password ? await hashPassword(d.password) : undefined;
    const [existing] = await db.select().from(s.users).where(eq(s.users.email, d.email));
    if (existing) {
      await db
        .update(s.users)
        .set({ name: d.name, role: d.role, isBlocked: false, ...(passwordHash ? { passwordHash, passwordChangedAt: new Date() } : {}) })
        .where(eq(s.users.id, existing.id));
    } else {
      if (!passwordHash) throw new Error("Set a password for the new staff member");
      await db.insert(s.users).values({ email: d.email, name: d.name, role: d.role, passwordHash, source: "admin" });
    }
    await logActivity(admin, "update", "staff", d.email, `Gave ${d.email} ${d.role} access`);
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function removeStaff(id: number): Promise<Result> {
  const admin = await requireAdmin({ owner: true });
  if (id === admin.id) return { ok: false, error: "You can't remove yourself" };
  // demoting also ends their admin sessions immediately (role is re-read on every request)
  await db.update(s.users).set({ role: "customer", passwordChangedAt: new Date() }).where(eq(s.users.id, id));
  await logActivity(admin, "update", "staff", id, "Removed staff access");
  return { ok: true, message: "Access removed" };
}

export async function refreshSiteCache(): Promise<Result> {
  const admin = await requireAdmin();
  updateTag("catalog");
  updateTag("content");
  updateTag("settings");
  await logActivity(admin, "cache", "site", null, "Refreshed the storefront cache");
  return { ok: true, message: "Storefront refreshed" };
}
