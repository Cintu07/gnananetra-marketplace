import { and, desc, eq, sql } from "drizzle-orm";
import { requireSeller } from "@/lib/seller-auth";
import { db, schema as s } from "@/lib/db";
import { DEFAULT_COMMISSION_PCT, commissionOf, sellerEarnings, sellerPayouts } from "@/lib/marketplace";
import { rupees, rupees2 } from "@/lib/money";
import { formatDate } from "@/lib/site";

export const metadata = { title: "Earnings" };

export default async function Earnings() {
  const { seller } = await requireSeller();
  const e = await sellerEarnings(seller.id);
  const payouts = await sellerPayouts(seller.id);
  const lines = await db
    .select({ item: s.orderItems, number: s.orders.number, at: s.orders.createdAt, status: s.orders.status })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, seller.id), sql`${s.orders.status} not in ('cancelled', 'failed', 'refunded', 'pending')`))
    .orderBy(desc(s.orders.createdAt))
    .limit(60);
  const pct = seller.commissionPct ?? DEFAULT_COMMISSION_PCT;

  return (
    <div>
      <p className="eyebrow mb-1.5">Money</p>
      <h1 className="section-title">Earnings</h1>
      <p className="mt-1 text-[14.5px] text-muted">The marketplace keeps {pct}% of each sale. The rest is yours, payable once the customer has the goods.</p>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Payable to you now", v: e.balance, big: true, sub: "Delivered, minus what we already paid you" },
          { l: "Sold, still in progress", v: e.inProgress.net, sub: "Becomes payable on delivery" },
          { l: "Paid out so far", v: e.paid, sub: `${payouts.length} payout${payouts.length === 1 ? "" : "s"}` },
          { l: "Commission kept", v: e.delivered.commission + e.inProgress.commission, sub: `${pct}% of your sales` },
        ].map((c) => (
          <li key={c.l} className={`card p-4 sm:p-5 ${c.big ? "bg-ink text-white ring-ink" : ""}`}>
            <p className={`text-[12.5px] font-semibold ${c.big ? "text-white/70" : "text-muted"}`}>{c.l}</p>
            <p className="mt-1 text-[24px] leading-tight font-extrabold tracking-[-0.02em] tabular-nums sm:text-[28px]">{rupees(c.v)}</p>
            <p className={`mt-1 text-[12.5px] ${c.big ? "text-white/60" : "text-muted"}`}>{c.sub}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card overflow-x-auto">
          <h2 className="px-5 pt-4 text-[17px] font-bold">Sales</h2>
          <table className="mt-2 w-full min-w-[560px] text-left text-[13.5px]">
            <thead className="border-b border-line text-[12px] tracking-wide text-faint uppercase">
              <tr>
                <th className="px-5 py-2.5">Order</th>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5 text-right">Sold for</th>
                <th className="px-3 py-2.5 text-right">Commission</th>
                <th className="px-5 py-2.5 text-right">You get</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map(({ item, number, at }) => {
                const c = commissionOf(item.lineTotal, item.commissionPct);
                return (
                  <tr key={item.id}>
                    <td className="px-5 py-3"><span className="font-semibold">{number}</span><br /><span className="text-[12px] text-muted">{formatDate(at)}</span></td>
                    <td className="max-w-[240px] px-3 py-3"><span className="line-clamp-2">{item.name}</span><span className="text-[12px] text-muted"> × {item.qty}</span></td>
                    <td className="px-3 py-3 text-right tabular-nums">{rupees2(item.lineTotal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{rupees2(c)} <span className="text-[12px]">({item.commissionPct}%)</span></td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">{rupees2(item.lineTotal - c)}</td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">No sales yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="card h-fit p-5">
          <h2 className="text-[17px] font-bold">Payouts</h2>
          {payouts.length === 0 ? (
            <p className="mt-3 text-[14px] text-muted">Nothing paid out yet. The team transfers your balance to your bank account and records it here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-[14px]">
              {payouts.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex justify-between"><span className="font-bold tabular-nums">{rupees(p.amount)}</span><span className="text-muted">{formatDate(p.createdAt)}</span></div>
                  {(p.reference || p.note) && <p className="text-[12.5px] text-muted">{[p.reference && `Ref ${p.reference}`, p.note].filter(Boolean).join(" · ")}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
