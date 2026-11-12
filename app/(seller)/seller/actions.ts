"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { chunks, db, runBatch, schema as s } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { requireSeller } from "@/lib/seller-auth";
import { hashPassword } from "@/lib/password";
import { limited } from "@/lib/ratelimit";
import { cleanHtml, noDashes, slugify } from "@/lib/sanitize";
import { setOrderStatus } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { sendEmail, esc } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export type Result<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the form" };
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Something went wrong" };
};
const str = (max: number) => z.string().trim().max(max);
// optional text: blank, missing or null all become null
const opt = (max: number) => str(max).nullish().transform((v) => v || null);

async function uniqueSlug(table: typeof s.sellers | typeof s.products, base: string, exceptId?: number) {
  const root = slugify(base) || "store";
  let slug = root;
  for (let n = 2; n < 200; n++) {
    const rows = await db.select({ id: table.id }).from(table).where(exceptId ? and(eq(table.slug, slug), ne(table.id, exceptId)) : eq(table.slug, slug));
    if (!rows.length) return slug;
    slug = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

// ---------------------------------------------------------------- applying to sell (public)

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export async function applyToSell(_: { error?: string; fields?: Record<string, string> } | null, form: FormData): Promise<{ error?: string; fields?: Record<string, string> }> {
  const raw = Object.fromEntries(form.entries()) as Record<string, string>;
  const fields = { name: raw.name ?? "", email: raw.email ?? "", phone: raw.phone ?? "", storeName: raw.storeName ?? "", city: raw.city ?? "", state: raw.state ?? "", gstin: raw.gstin ?? "", about: raw.about ?? "" };
  const parsed = z
    .object({
      name: str(120).min(2, "Please tell us your name"),
      email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
      phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10 digit mobile number"),
      password: z.string().min(8, "Use at least 8 characters for your password").max(200),
      storeName: str(80).min(3, "Give your store a name (3 letters or more)"),
      city: str(80).min(2, "Which city are you in?"),
      state: str(80).min(2, "Which state are you in?"),
      gstin: z.string().trim().toUpperCase().max(15).optional().transform((v) => v || null).refine((v) => !v || GSTIN.test(v), "That GSTIN does not look right (15 characters)"),
      pickupAddress: str(400).min(8, "Where should couriers collect your orders?"),
      about: opt(600),
      agree: z.literal("on", { error: "Please accept the seller terms" }),
    })
    .safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form", fields };
  // only complete applications count against the limit, so a few typos never lock a real applicant out
  if (await limited("seller-apply", 10, 3600)) return { error: "Too many applications from this connection. Please try again later.", fields };
  const d = parsed.data;
  const [existing] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, d.email));
  if (existing) return { error: "That email already has an account. Sign in, then ask us to add a seller store to it.", fields };
  const passwordHash = await hashPassword(d.password);
  const slug = await uniqueSlug(s.sellers, d.storeName);
  const [user] = await db.insert(s.users).values({ email: d.email, name: d.name, phone: d.phone, role: "seller", passwordHash, source: "seller-signup" }).returning();
  await db.insert(s.sellers).values({ userId: user.id, storeName: noDashes(d.storeName), slug, phone: d.phone, city: d.city, state: d.state, gstin: d.gstin, pickupAddress: d.pickupAddress, about: d.about && noDashes(d.about), status: "pending" });
  const settings = await getSettings();
  await sendEmail(settings.store.email, `New seller application: ${d.storeName}`, `<p><strong>${esc(d.storeName)}</strong> from ${esc(d.city)}, ${esc(d.state)} applied to sell.</p><p>${esc(d.name)}, ${esc(d.phone)}, ${esc(d.email)}</p><p><a href="${SITE_URL}/admin/sellers">Review in admin</a></p>`);
  await startSession(user);
  redirect("/seller");
}

// ---------------------------------------------------------------- the store profile

export async function saveStoreProfile(_: Result | null, form: FormData): Promise<Result> {
  const { seller } = await requireSeller();
  try {
    const d = z
      .object({
        storeName: str(80).min(3, "Give your store a name"),
        tagline: opt(120),
        about: opt(800),
        phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10 digit mobile number"),
        city: str(80).min(2),
        state: str(80).min(2),
        gstin: z.string().trim().toUpperCase().max(15).optional().transform((v) => v || null).refine((v) => !v || GSTIN.test(v), "That GSTIN does not look right"),
        pickupAddress: str(400).min(8, "Where should couriers collect your orders?"),
      })
      .parse(Object.fromEntries(form.entries()));
    const slug = d.storeName === seller.storeName ? seller.slug : await uniqueSlug(s.sellers, d.storeName, seller.id);
    await db
      .update(s.sellers)
      .set({ ...d, storeName: noDashes(d.storeName), slug, tagline: d.tagline && noDashes(d.tagline), about: d.about && noDashes(d.about) })
      .where(eq(s.sellers.id, seller.id));
    updateTag("catalog");
    return { ok: true, message: "Store details saved" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------- products

const productInput = z.object({
  id: z.number().int().optional(),
  name: str(200).min(3, "Product name is required (3 letters or more)"),
  categoryId: z.number().int().positive("Choose a category"),
  price: z.number().int().min(100, "Set a selling price").max(1_000_000_000),
  mrp: z.number().int().min(0).max(1_000_000_000).nullable(),
  stockQty: z.number().int().min(0, "Stock cannot be negative").max(1_000_000),
  sku: opt(80),
  gstRate: z.number().int().refine((v) => [0, 5, 12, 18, 28].includes(v), "Pick a valid GST rate"),
  hsn: opt(12),
  warranty: opt(120),
  highlights: z.array(str(300)).max(10),
  description: str(8000),
  images: z.array(z.object({ url: z.string().min(1).max(500), width: z.number().nullable(), height: z.number().nullable() })).max(8),
  status: z.enum(["published", "draft"]),
});
export type SellerProductInput = z.infer<typeof productInput>;

export async function saveSellerProduct(raw: SellerProductInput): Promise<Result<{ id: number }>> {
  const { seller } = await requireSeller();
  try {
    if (seller.status === "rejected") throw new Error("Your application was not approved, so you cannot add products.");
    const d = productInput.parse(raw);
    if (d.mrp && d.mrp < d.price) throw new Error("MRP should be higher than the selling price (or leave it empty)");
    if (d.status === "published" && d.images.length === 0) throw new Error("Add at least one photo before you publish");
    const [cat] = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.id, d.categoryId));
    if (!cat) throw new Error("Choose a category");

    let existing: typeof s.products.$inferSelect | undefined;
    if (d.id) {
      [existing] = await db.select().from(s.products).where(eq(s.products.id, d.id));
      if (!existing || existing.sellerId !== seller.id) throw new Error("That product is not yours");
    }
    const slug = await uniqueSlug(s.products, `${d.name}`, d.id);
    const description = cleanHtml(d.description.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join(""));
    const values = {
      name: noDashes(d.name),
      slug: existing && existing.name === noDashes(d.name) ? existing.slug : slug,
      sku: d.sku,
      sellerId: seller.id,
      status: d.status,
      price: d.price,
      mrp: d.mrp || null,
      stockStatus: d.stockQty === 0 ? "out_of_stock" : "in_stock",
      stockQty: d.stockQty,
      highlights: d.highlights.filter(Boolean).map(noDashes),
      descriptionHtml: description,
      gstRate: d.gstRate,
      hsn: d.hsn,
      warranty: d.warranty && noDashes(d.warranty),
      updatedAt: new Date(),
    };
    let id = d.id;
    if (!id) [{ id }] = await db.insert(s.products).values(values).returning({ id: s.products.id });
    const pid = id!;
    await runBatch([
      d.id ? db.update(s.products).set(values).where(eq(s.products.id, pid)) : db.update(s.products).set({ updatedAt: new Date() }).where(eq(s.products.id, pid)),
      db.delete(s.productImages).where(eq(s.productImages.productId, pid)),
      ...d.images.map((img, i) => db.insert(s.productImages).values({ productId: pid, url: img.url, alt: noDashes(d.name), width: img.width, height: img.height, sort: i })),
      db.delete(s.productCategories).where(eq(s.productCategories.productId, pid)),
      db.insert(s.productCategories).values({ productId: pid, categoryId: d.categoryId }),
    ]);
    updateTag("catalog");
    return { ok: true, data: { id: pid }, message: seller.status === "approved" ? "Saved" : "Saved. It goes on sale once the team approves your store." };
  } catch (e) {
    return fail(e) as Result<{ id: number }>;
  }
}

/** Quick stock and visibility changes from the product list. */
export async function quickProduct(id: number, patch: { stockQty?: number; status?: "published" | "draft" }): Promise<Result> {
  const { seller } = await requireSeller();
  try {
    const [p] = await db.select().from(s.products).where(and(eq(s.products.id, id), eq(s.products.sellerId, seller.id)));
    if (!p) throw new Error("That product is not yours");
    const set: Partial<typeof s.products.$inferInsert> = { updatedAt: new Date() };
    if (patch.stockQty !== undefined) {
      const q = z.number().int().min(0).max(1_000_000).parse(patch.stockQty);
      set.stockQty = q;
      set.stockStatus = q === 0 ? "out_of_stock" : "in_stock";
    }
    if (patch.status) set.status = patch.status;
    await db.update(s.products).set(set).where(eq(s.products.id, id));
    updateTag("catalog");
    return { ok: true, message: "Updated" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSellerProduct(id: number): Promise<Result> {
  const { seller } = await requireSeller();
  try {
    const [p] = await db.select({ id: s.products.id }).from(s.products).where(and(eq(s.products.id, id), eq(s.products.sellerId, seller.id)));
    if (!p) throw new Error("That product is not yours");
    const used = await db.select({ id: s.orderItems.id }).from(s.orderItems).where(eq(s.orderItems.productId, id)).limit(1);
    // products that were ever ordered are archived, so order history stays whole
    if (used.length) await db.update(s.products).set({ status: "archived", updatedAt: new Date() }).where(eq(s.products.id, id));
    else await db.delete(s.products).where(eq(s.products.id, id));
    updateTag("catalog");
    return { ok: true, message: used.length ? "Archived (it has past orders)" : "Deleted" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------- fulfilling orders

async function mineIn(orderId: number, sellerId: number) {
  return db.select({ id: s.orderItems.id, fulfilment: s.orderItems.fulfilment }).from(s.orderItems).where(and(eq(s.orderItems.orderId, orderId), eq(s.orderItems.sellerId, sellerId)));
}

async function rollUp(orderId: number, actor: { name: string }, carrier?: string, number?: string) {
  const all = await db.select({ f: s.orderItems.fulfilment }).from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  const live = all.filter((i) => i.f !== "cancelled");
  if (live.length && live.every((i) => i.f === "delivered")) await setOrderStatus(orderId, "delivered", actor, {});
  else if (live.length && live.every((i) => i.f === "shipped" || i.f === "delivered")) await setOrderStatus(orderId, "shipped", actor, { trackingCarrier: carrier ?? null, trackingNumber: number ?? null });
}

export async function shipMyItems(form: FormData): Promise<void> {
  const { seller, user } = await requireSeller();
  const orderId = Number(form.get("orderId"));
  const carrier = String(form.get("carrier") ?? "").trim().slice(0, 60);
  const number = String(form.get("tracking") ?? "").trim().slice(0, 80);
  if (!Number.isInteger(orderId) || !carrier || !number) redirect(`/seller/orders?error=${encodeURIComponent("Add the courier and the tracking number")}`);
  const mine = await mineIn(orderId, seller.id);
  if (!mine.length) redirect("/seller/orders");
  const [order] = await db.select({ status: s.orders.status }).from(s.orders).where(eq(s.orders.id, orderId));
  if (!order || !["processing", "packed", "shipped"].includes(order.status)) redirect(`/seller/orders?error=${encodeURIComponent("This order is not ready to ship")}`);
  const now = new Date();
  for (const part of chunks(mine.map((m) => m.id))) {
    await db.update(s.orderItems).set({ fulfilment: "shipped", trackingCarrier: carrier, trackingNumber: number, shippedAt: now }).where(and(inArray(s.orderItems.id, part), eq(s.orderItems.fulfilment, "pending")));
  }
  await db.insert(s.orderEvents).values({ orderId, kind: "status", message: `${seller.storeName} shipped their items via ${carrier} (${number}).`, actor: user.name || seller.storeName, isCustomerVisible: true });
  await rollUp(orderId, { name: seller.storeName }, carrier, number);
  redirect("/seller/orders?view=shipped");
}

export async function deliverMyItems(form: FormData): Promise<void> {
  const { seller, user } = await requireSeller();
  const orderId = Number(form.get("orderId"));
  if (!Number.isInteger(orderId)) redirect("/seller/orders");
  const mine = await mineIn(orderId, seller.id);
  if (!mine.length) redirect("/seller/orders");
  for (const part of chunks(mine.map((m) => m.id))) {
    await db.update(s.orderItems).set({ fulfilment: "delivered" }).where(and(inArray(s.orderItems.id, part), eq(s.orderItems.fulfilment, "shipped")));
  }
  await db.insert(s.orderEvents).values({ orderId, kind: "status", message: `${seller.storeName}'s items were delivered.`, actor: user.name || seller.storeName, isCustomerVisible: true });
  await rollUp(orderId, { name: seller.storeName });
  redirect("/seller/orders?view=delivered");
}
