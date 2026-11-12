import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, lt, ne, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidateTag } from "next/cache";
import { brokeRule, chunks, db, runBatch, schema as s } from "@/lib/db";
import type { Address } from "@/db/schema";
import { priceCart, type CartLineInput } from "@/lib/pricing";
import { getSettingsFresh } from "@/lib/settings";
import { createRazorpayOrder, refundPayment } from "@/lib/razorpay";
import { newOrderAlert, orderPlacedEmail, orderStatusEmail, sellerNewOrderEmail } from "@/lib/email";
import { ORDER_STATUS_LABEL } from "@/lib/site";
import { commissionFor, sellerCommissions } from "@/lib/marketplace";

// How stock stays honest on D1 (no row locks, no interactive transactions):
// every change that matters is ONE batch, which D1 runs as a single all-or-nothing
// transaction, one batch at a time. Taking stock is `stock_qty = stock_qty - qty`, and the
// products_stock_nonneg rule in db/schema.ts refuses any value below zero. So when two people
// race for the last unit, the second batch breaks the rule and is undone in full: no order,
// no items, no half-taken stock. Proven by `npm run race`.

export class CheckoutError extends Error {}

type Stmt = BatchItem<"sqlite">;
const batch = (stmts: Stmt[]) => runBatch(stmts);

export type CheckoutInput = {
  items: CartLineInput[];
  name: string;
  email: string;
  phone: string;
  shipping: Address;
  billing: Address | null;
  company: string | null;
  gstin: string | null;
  couponCode: string | null;
  paymentMethod: "razorpay" | "cod";
  note: string | null;
};

const PENDING_MINUTES = 45;

/** Take stock for counted products. Uncounted ones (stock_qty null) are left alone. */
function holdStmts(items: { productId: number | null; qty: number }[], onlyIf?: SQL): Stmt[] {
  return items
    .filter((i) => i.productId)
    .map((i) =>
      db
        .update(s.products)
        .set({
          stockQty: sql`stock_qty - ${i.qty}`,
          stockStatus: sql`case when stock_qty - ${i.qty} <= 0 then 'out_of_stock' else stock_status end`,
        })
        .where(and(eq(s.products.id, i.productId!), isNotNull(s.products.stockQty), onlyIf)),
    );
}

/** Give an order's stock (and coupon use) back, only while the order still holds it.
 *  The caller must follow these with an update that sets stock_held = 0. */
function releaseStmts(orderId: number, also: SQL = sql`1 = 1`): Stmt[] {
  const held = sql`exists (select 1 from orders where orders.id = ${orderId} and orders.stock_held = 1 and ${also})`;
  const qty = sql`(select sum(qty) from order_items where order_id = ${orderId} and product_id = products.id)`;
  return [
    db.run(sql`update products set
        stock_qty = stock_qty + ${qty},
        stock_status = case when stock_status = 'out_of_stock' and stock_qty + ${qty} > 0 then 'in_stock' else stock_status end
      where stock_qty is not null and id in (select product_id from order_items where order_id = ${orderId}) and ${held}`),
    db.run(sql`update coupons set used_count = max(used_count - 1, 0)
      where code = (select coupon_code from orders where orders.id = ${orderId}) and ${held}`),
  ];
}

/** Count units sold (and deal progress) for an order. `oid` is an id or a subquery. */
function salesStmt(oid: SQL): Stmt {
  const qty = sql`(select sum(qty) from order_items where order_id = ${oid} and product_id = products.id)`;
  return db.run(sql`update products set
      total_sales = total_sales + ${qty},
      deal_sold = case when is_deal then deal_sold + ${qty} else deal_sold end
    where id in (select product_id from order_items where order_id = ${oid})`);
}

/** Keep each seller's line status in step when the team (not the seller) moves the whole order. */
function lineStatusStmt(orderId: number, to: "shipped" | "delivered" | "cancelled", extra: { trackingCarrier?: string | null; trackingNumber?: string | null } = {}): Stmt {
  if (to === "cancelled") return db.run(sql`update order_items set fulfilment = 'cancelled' where order_id = ${orderId} and fulfilment != 'delivered'`);
  if (to === "delivered") return db.run(sql`update order_items set fulfilment = 'delivered' where order_id = ${orderId} and fulfilment in ('pending', 'shipped')`);
  return db.run(sql`update order_items set fulfilment = 'shipped', shipped_at = ${Date.now()},
      tracking_carrier = coalesce(tracking_carrier, ${extra.trackingCarrier ?? null}), tracking_number = coalesce(tracking_number, ${extra.trackingNumber ?? null})
    where order_id = ${orderId} and fulfilment = 'pending'`);
}

async function shortageMessage(lines: { productId: number; qty: number; name: string }[]) {
  const rows = await db
    .select({ id: s.products.id, name: s.products.name, stockQty: s.products.stockQty })
    .from(s.products)
    .where(inArray(s.products.id, lines.map((l) => l.productId)));
  for (const l of lines) {
    const p = rows.find((r) => r.id === l.productId);
    if (p && p.stockQty !== null && p.stockQty < l.qty) return `Only ${p.stockQty} of ${p.name} left. Please update your cart.`;
  }
  return "Some items in your cart just sold out. Please update your cart.";
}

/** Online orders nobody paid for within 45 minutes give their stock back. */
export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - PENDING_MINUTES * 60_000);
  const stale = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(and(eq(s.orders.status, "pending"), eq(s.orders.paymentMethod, "razorpay"), lt(s.orders.createdAt, cutoff)));
  let expired = 0;
  for (const { id } of stale) {
    // still pending inside the batch, so a payment that lands at the same moment wins cleanly
    const res = await batch([
      ...releaseStmts(id, sql`orders.status = 'pending'`),
      db
        .update(s.orders)
        .set({ status: "failed", stockHeld: false, updatedAt: new Date() })
        .where(and(eq(s.orders.id, id), eq(s.orders.status, "pending")))
        .returning({ id: s.orders.id }),
    ]);
    if ((res.at(-1) as unknown[]).length) {
      expired += 1;
      await db.insert(s.orderEvents).values({ orderId: id, kind: "status", message: "Payment not completed in time. Stock released.", actor: "system" });
    }
  }
  if (expired) revalidateTag("catalog", "max");
}

export async function createOrder(input: CheckoutInput, signedInUserId: number | null) {
  const settings = await getSettingsFresh();
  await expireStaleOrders();
  const email = input.email.trim().toLowerCase();

  const quote = await priceCart(input.items, settings, { couponCode: input.couponCode, paymentMethod: input.paymentMethod });
  if (!quote.lines.length) throw new CheckoutError("Your cart is empty.");
  const problem = quote.lines.find((l) => l.problem);
  if (problem) throw new CheckoutError(`${problem.name}: ${problem.problem}. Please update your cart.`);
  if (input.couponCode && !quote.coupon?.applied) throw new CheckoutError(quote.coupon?.message ?? "This code is not valid");
  if (input.paymentMethod === "cod" && !quote.codAvailable) throw new CheckoutError("Cash on delivery is not available for this order.");
  if (input.paymentMethod === "razorpay" && !quote.onlineAvailable) throw new CheckoutError("Online payment is not available right now.");

  // every buyer becomes a customer record, so the admin CRM sees guests too
  let userId = signedInUserId;
  if (!userId) {
    await db
      .insert(s.users)
      .values({ email, name: input.name, phone: input.phone, role: "customer", source: "checkout" })
      .onConflictDoNothing({ target: s.users.email });
    const [u] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
    userId = u?.id ?? null;
  }

  const sellerPct = await sellerCommissions(quote.lines.map((l) => l.sellerId));
  const cod = input.paymentMethod === "cod";
  const couponCode = quote.coupon?.applied ? quote.coupon.code : null;
  // the order's id isn't known until it's inserted, so the rest of the batch finds it by a
  // one-off temporary number; the last statement swaps that for the real GN number
  const tmp = `TMP${randomBytes(8).toString("hex")}`;
  const oid = sql`(select id from orders where number = ${tmp})`;
  const ref = oid as unknown as number;

  let res: unknown[];
  try {
    res = await batch([
      db.insert(s.orders).values({
        number: tmp,
        userId,
        email,
        phone: input.phone,
        name: input.name,
        shippingAddress: input.shipping,
        billingAddress: input.billing ?? input.shipping,
        gstin: input.gstin,
        status: cod ? "processing" : "pending",
        paymentMethod: input.paymentMethod,
        paymentStatus: "unpaid",
        subtotal: quote.subtotal,
        discount: quote.discount,
        shippingFee: quote.shippingFee,
        codFee: quote.codFee,
        total: quote.total,
        couponCode,
        customerNote: input.note,
        stockHeld: true,
        accessKey: randomBytes(12).toString("base64url"),
        source: "web",
      }),
      // one statement per line keeps each under D1's 100 values per statement
      ...quote.lines.map((l) =>
        db.insert(s.orderItems).values({
          orderId: ref,
          productId: l.productId,
          name: l.name,
          sku: l.sku,
          image: l.image,
          unitPrice: l.unitPrice,
          qty: l.qty,
          lineTotal: l.lineTotal,
          gstRate: l.gstRate,
          hsn: l.hsn,
          sellerId: l.sellerId,
          commissionPct: commissionFor(l.sellerId, sellerPct),
        }),
      ),
      ...holdStmts(quote.lines),
      // coupons_usage_within_limit undoes the whole order if this was the last use and someone beat us to it
      ...(couponCode ? [db.update(s.coupons).set({ usedCount: sql`used_count + 1` }).where(eq(s.coupons.code, couponCode))] : []),
      ...(input.company ? [db.insert(s.orderEvents).values({ orderId: ref, kind: "note", message: `Company: ${input.company}`, actor: "customer" })] : []),
      db.insert(s.orderEvents).values({
        orderId: ref,
        kind: "created",
        message: cod ? "Order placed with cash on delivery." : "Order created, waiting for online payment.",
        actor: "customer",
        isCustomerVisible: true,
      }),
      ...(cod ? [salesStmt(oid)] : []),
      db
        .update(s.orders)
        .set({ number: sql`'GN' || (10000 + id)` })
        .where(eq(s.orders.number, tmp))
        .returning(),
    ]);
  } catch (e) {
    if (brokeRule(e, "products_stock_nonneg")) throw new CheckoutError(await shortageMessage(quote.lines));
    if (brokeRule(e, "coupons_usage_within_limit")) throw new CheckoutError("This code has just been used up.");
    throw e;
  }
  const [row] = res.at(-1) as (typeof s.orders.$inferSelect)[];
  const order = { ...row, lines: quote.lines };

  if (order.paymentMethod === "razorpay") {
    try {
      const rp = await createRazorpayOrder(order.total, order.number, { order: order.number });
      await db.update(s.orders).set({ razorpayOrderId: rp.id }).where(eq(s.orders.id, order.id));
      return { ...order, razorpayOrderId: rp.id, testPayment: rp.test };
    } catch {
      await cancelOrder(order.id, "Could not start the payment.", null);
      throw new CheckoutError("We could not start the payment. Please try again in a minute.");
    }
  }

  revalidateTag("catalog", "max");
  await notifyPlaced(order.id);
  return { ...order, razorpayOrderId: null, testPayment: false };
}

async function mailShape(orderId: number) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return null;
  const items = await db.select({ name: s.orderItems.name, qty: s.orderItems.qty, lineTotal: s.orderItems.lineTotal }).from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  return { ...o, items };
}

async function notifyPlaced(orderId: number) {
  const o = await mailShape(orderId);
  if (!o) return;
  const settings = await getSettingsFresh();
  await orderPlacedEmail(o);
  await newOrderAlert(settings.store.email, o);
  // each seller hears about their own part of the order (never the other stores' items)
  const mine = await db
    .select({ sellerId: s.orderItems.sellerId, name: s.orderItems.name, qty: s.orderItems.qty, lineTotal: s.orderItems.lineTotal, email: s.users.email, store: s.sellers.storeName })
    .from(s.orderItems)
    .innerJoin(s.sellers, eq(s.sellers.id, s.orderItems.sellerId))
    .innerJoin(s.users, eq(s.users.id, s.sellers.userId))
    .where(eq(s.orderItems.orderId, orderId));
  const bySeller = new Map<number, typeof mine>();
  for (const m of mine) bySeller.set(m.sellerId!, [...(bySeller.get(m.sellerId!) ?? []), m]);
  for (const lines of bySeller.values()) {
    await sellerNewOrderEmail(lines[0].email, { number: o.number, store: lines[0].store, city: o.shippingAddress?.city ?? null, items: lines.map((l) => ({ name: l.name, qty: l.qty, lineTotal: l.lineTotal })), cod: o.paymentMethod === "cod" });
  }
}

/** Idempotent: the browser callback and the webhook can both call it, only the first one counts. */
export async function markPaid(orderId: number, paymentId: string, actor: string) {
  const [before] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!before || before.paymentStatus === "paid") return null;
  const wasCancelled = before.status === "cancelled" || before.status === "failed";
  const items = await db.select({ productId: s.orderItems.productId, qty: s.orderItems.qty }).from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  const now = new Date();
  const paid = (status: SQL | string, stockHeld: boolean) =>
    db
      .update(s.orders)
      .set({ status, paymentStatus: "paid", razorpayPaymentId: paymentId, paidAt: now, stockHeld, updatedAt: now })
      .where(and(eq(s.orders.id, orderId), ne(s.orders.paymentStatus, "paid")))
      .returning();

  let stockOk = true;
  let rows: (typeof s.orders.$inferSelect)[];
  try {
    const res = await batch([
      // if the order timed out its stock went back on sale: take it again (a no-op while still held)
      ...holdStmts(items, sql`exists (select 1 from orders where orders.id = ${orderId} and orders.stock_held = 0 and orders.payment_status != 'paid')`),
      paid(sql`case when status = 'cancelled' then 'on_hold' else 'processing' end`, true),
    ]);
    rows = res.at(-1) as typeof rows;
  } catch (e) {
    if (!brokeRule(e, "products_stock_nonneg")) throw e;
    // someone else bought it meanwhile: keep the payment, flag the order for the team
    stockOk = false;
    rows = await paid("on_hold", false);
  }
  const [o] = rows;
  if (!o) return null; // the other caller got there first

  await batch([
    salesStmt(sql`${orderId}`),
    db.insert(s.orderEvents).values({
      orderId,
      kind: "paid",
      message: !stockOk
        ? `Payment ${paymentId} arrived after the order timed out and the stock was sold to someone else. Refund the customer or restock and ship.`
        : wasCancelled
          ? `Payment ${paymentId} received after the order had ${before.status === "failed" ? "timed out" : "been cancelled"}. Please review.`
          : `Payment received (${paymentId}).`,
      actor,
      isCustomerVisible: true,
    }),
  ]);
  revalidateTag("catalog", "max");
  await notifyPlaced(orderId);
  return o;
}

export async function markPaymentFailed(orderId: number, reason: string) {
  await db.insert(s.orderEvents).values({ orderId, kind: "payment_failed", message: reason, actor: "customer" });
}

export async function cancelOrder(orderId: number, reason: string, actor: { name: string } | null) {
  const [before] = await db.select({ stockHeld: s.orders.stockHeld }).from(s.orders).where(eq(s.orders.id, orderId));
  const now = new Date();
  await batch([
    ...releaseStmts(orderId),
    lineStatusStmt(orderId, "cancelled"),
    db.update(s.orders).set({ status: "cancelled", stockHeld: false, cancelledAt: now, updatedAt: now }).where(eq(s.orders.id, orderId)),
    db.insert(s.orderEvents).values({
      orderId,
      kind: "status",
      message: `Cancelled. ${reason}${before?.stockHeld ? " Stock returned." : ""}`.trim(),
      actor: actor?.name ?? "system",
      isCustomerVisible: true,
    }),
  ]);
  revalidateTag("catalog", "max");
}

export async function setOrderStatus(
  orderId: number,
  status: string,
  actor: { name: string },
  extra: { trackingCarrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; notify?: boolean } = {},
) {
  if (!(status in ORDER_STATUS_LABEL)) throw new Error("Unknown status");
  const [before] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!before) throw new Error("Order not found");
  if (status === "cancelled") {
    await cancelOrder(orderId, "Cancelled by the store.", actor);
  } else {
    const now = new Date();
    await batch([
      db
        .update(s.orders)
        .set({
          status,
          updatedAt: now,
          ...(status === "shipped" ? { shippedAt: before.shippedAt ?? now } : {}),
          ...(status === "delivered" ? { deliveredAt: now } : {}),
          // cash collected on delivery
          ...(status === "delivered" && before.paymentMethod === "cod" && before.paymentStatus === "unpaid" ? { paymentStatus: "paid", paidAt: now } : {}),
          ...(extra.trackingCarrier !== undefined ? { trackingCarrier: extra.trackingCarrier } : {}),
          ...(extra.trackingNumber !== undefined ? { trackingNumber: extra.trackingNumber } : {}),
          ...(extra.trackingUrl !== undefined ? { trackingUrl: extra.trackingUrl } : {}),
        })
        .where(eq(s.orders.id, orderId)),
      ...(status === "shipped" || status === "delivered" ? [lineStatusStmt(orderId, status, extra)] : []),
      db.insert(s.orderEvents).values({
        orderId,
        kind: "status",
        message: `${ORDER_STATUS_LABEL[status]}${status === "shipped" && extra.trackingNumber ? ` via ${extra.trackingCarrier ?? "courier"} (${extra.trackingNumber})` : ""}.`,
        actor: actor.name,
        isCustomerVisible: true,
      }),
    ]);
  }
  if (extra.notify !== false && ["shipped", "delivered", "cancelled", "packed"].includes(status)) {
    const o = await mailShape(orderId);
    if (o) await orderStatusEmail(o);
  }
}

export async function refundOrder(orderId: number, amount: number, reason: string, actor: { name: string }) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) throw new Error("Order not found");
  const refundable = o.total - o.refundedAmount;
  if (amount <= 0 || amount > refundable) throw new Error(`You can refund up to ₹${(refundable / 100).toLocaleString("en-IN")}`);
  let note = "Recorded as refunded (outside the payment gateway).";
  if (o.paymentMethod === "razorpay" && o.razorpayPaymentId && o.paymentStatus !== "unpaid") {
    const r = await refundPayment(o.razorpayPaymentId, amount);
    note = r.test ? `Test refund ${r.id}.` : `Razorpay refund ${r.id}.`;
  }
  const refunded = o.refundedAmount + amount;
  const full = refunded >= o.total;
  const giveBack = full && !["delivered", "shipped"].includes(o.status);
  await batch([
    ...(giveBack ? [...releaseStmts(orderId), lineStatusStmt(orderId, "cancelled")] : []),
    db
      .update(s.orders)
      .set({
        refundedAmount: refunded,
        paymentStatus: full ? "refunded" : "partially_refunded",
        status: full ? "refunded" : o.status,
        ...(giveBack ? { stockHeld: false } : {}),
        updatedAt: new Date(),
      })
      .where(eq(s.orders.id, orderId)),
    db.insert(s.orderEvents).values({
      orderId,
      kind: "refund",
      message: `Refunded ₹${(amount / 100).toLocaleString("en-IN")}. ${reason ? reason + ". " : ""}${note}`,
      actor: actor.name,
      isCustomerVisible: true,
    }),
  ]);
}

export async function getOrderFull(where: { id?: number; number?: string }) {
  const [o] = await db
    .select()
    .from(s.orders)
    .where(where.id ? eq(s.orders.id, where.id) : eq(s.orders.number, where.number ?? ""));
  if (!o) return null;
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id)).orderBy(asc(s.orderItems.id));
  const events = await db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, o.id)).orderBy(desc(s.orderEvents.createdAt), desc(s.orderEvents.id));
  return { ...o, items, events };
}

export async function ordersForUser(userId: number) {
  const list = await db.select().from(s.orders).where(eq(s.orders.userId, userId)).orderBy(desc(s.orders.createdAt));
  if (!list.length) return [];
  const items: { orderId: number; name: string; image: string | null; qty: number }[] = [];
  for (const ids of chunks(list.map((o) => o.id))) {
    items.push(
      ...(await db
        .select({ orderId: s.orderItems.orderId, name: s.orderItems.name, image: s.orderItems.image, qty: s.orderItems.qty })
        .from(s.orderItems)
        .where(inArray(s.orderItems.orderId, ids))),
    );
  }
  return list.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}
