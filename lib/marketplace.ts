import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";

// The marketplace layer: who the sellers are, what they earn, what the marketplace keeps.
// Money is whole paise like everywhere else. A seller earns the line total minus the commission.

/** What the marketplace keeps from each sale unless a seller has their own rate (set by the admin). */
export const DEFAULT_COMMISSION_PCT = 10;

export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

/** Commission per seller id for the sellers in this basket (null = their rate is the default). */
export async function sellerCommissions(ids: (number | null)[]): Promise<Map<number, number | null>> {
  const unique = [...new Set(ids.filter((x): x is number => x !== null))];
  if (!unique.length) return new Map();
  const rows = await db.select({ id: s.sellers.id, pct: s.sellers.commissionPct }).from(s.sellers).where(inArray(s.sellers.id, unique));
  return new Map(rows.map((r) => [r.id, r.pct]));
}

/** The rate frozen onto an order line when it is placed (later rate changes never rewrite old sales). */
export function commissionFor(sellerId: number | null, rates: Map<number, number | null>): number {
  if (sellerId === null) return 0; // the marketplace's own products have no commission
  return rates.get(sellerId) ?? DEFAULT_COMMISSION_PCT;
}

export const commissionOf = (lineTotal: number, pct: number) => Math.round((lineTotal * pct) / 100);

export async function getSellerForUser(userId: number) {
  const [row] = await db.select().from(s.sellers).where(eq(s.sellers.userId, userId));
  return row ?? null;
}

export type Money = { gross: number; commission: number; net: number };

/**
 * What a seller has earned, split by how far the money is:
 *  - delivered: the customer has the goods; this is payable to the seller
 *  - inProgress: sold and paid (or cash on delivery) but not delivered yet
 * minus payouts already made = the balance the marketplace owes them.
 * Cancelled lines and refunded or failed orders never count.
 */
export async function sellerEarnings(sellerId: number) {
  const rows = await db
    .select({
      fulfilment: s.orderItems.fulfilment,
      lineTotal: s.orderItems.lineTotal,
      pct: s.orderItems.commissionPct,
      orderStatus: s.orders.status,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, sellerId), sql`${s.orders.status} not in ('cancelled', 'failed', 'refunded', 'pending')`));
  const zero = (): Money => ({ gross: 0, commission: 0, net: 0 });
  const delivered = zero();
  const inProgress = zero();
  for (const r of rows) {
    if (r.fulfilment === "cancelled") continue;
    const target = r.fulfilment === "delivered" || r.orderStatus === "delivered" ? delivered : inProgress;
    const c = commissionOf(r.lineTotal, r.pct);
    target.gross += r.lineTotal;
    target.commission += c;
    target.net += r.lineTotal - c;
  }
  const [{ paid }] = await db.select({ paid: sql<number>`coalesce(sum(${s.payouts.amount}), 0)` }).from(s.payouts).where(eq(s.payouts.sellerId, sellerId));
  return { delivered, inProgress, paid, balance: delivered.net - paid };
}

export async function sellerPayouts(sellerId: number) {
  return db.select().from(s.payouts).where(eq(s.payouts.sellerId, sellerId)).orderBy(desc(s.payouts.createdAt));
}
