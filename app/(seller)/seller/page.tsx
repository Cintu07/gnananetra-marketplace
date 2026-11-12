import Link from "next/link";
import { and, count, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { AlertTriangle, ArrowRight, IndianRupee, Package, ReceiptIndianRupee, Truck } from "lucide-react";
import { requireSeller } from "@/lib/seller-auth";
import { db, schema as s } from "@/lib/db";
import { sellerEarnings } from "@/lib/marketplace";
import { rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";

export const metadata = { title: "Overview" };

export default async function SellerHome() {
  const { seller, user } = await requireSeller();
  const since = Date.now() - 30 * 86_400_000;
  const live = and(eq(s.products.sellerId, seller.id), eq(s.products.status, "published"));

  const [sales] = await db
    .select({ gross: sql<number>`coalesce(sum(${s.orderItems.lineTotal}), 0)`, n: sql<number>`count(distinct ${s.orderItems.orderId})` })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, seller.id), gt(s.orders.createdAt, new Date(since)), sql`${s.orders.status} not in ('cancelled', 'failed', 'refunded', 'pending')`));
  const [{ toShip }] = await db
    .select({ toShip: sql<number>`count(distinct ${s.orderItems.orderId})` })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, seller.id), eq(s.orderItems.fulfilment, "pending"), inArray(s.orders.status, ["processing", "packed"])));
  const [{ liveCount }] = await db.select({ liveCount: count() }).from(s.products).where(live);
  const low = await db
    .select({ id: s.products.id, name: s.products.name, qty: s.products.stockQty })
    .from(s.products)
    .where(and(eq(s.products.sellerId, seller.id), sql`${s.products.stockQty} is not null`, lte(s.products.stockQty, 3), inArray(s.products.status, ["published", "draft"])))
    .limit(5);
  const recent = await db
    .select({ id: s.orders.id, number: s.orders.number, status: s.orders.status, createdAt: s.orders.createdAt, mine: sql<number>`sum(${s.orderItems.lineTotal})`, fulfilment: sql<string>`min(${s.orderItems.fulfilment})` })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, seller.id), sql`${s.orders.status} not in ('pending', 'failed')`))
    .groupBy(s.orders.id)
    .orderBy(desc(s.orders.createdAt))
    .limit(6);
  const money = await sellerEarnings(seller.id);

  const cards = [
    { label: "Sales, last 30 days", value: rupees(sales.gross), sub: `${sales.n} order${sales.n === 1 ? "" : "s"}`, icon: IndianRupee },
    { label: "Orders to ship", value: String(toShip), sub: toShip ? "Waiting for you" : "All caught up", icon: Truck, href: "/seller/orders" },
    { label: "Products on sale", value: String(liveCount), sub: seller.status === "approved" ? "Visible to shoppers" : "Hidden until approved", icon: Package, href: "/seller/products" },
    { label: "Payable to you", value: rupees(money.balance), sub: `${rupees(money.inProgress.net)} still in progress`, icon: ReceiptIndianRupee, href: "/seller/earnings" },
  ];

  return (
    <div>
      <p className="eyebrow mb-1.5">Seller Centre</p>
      <h1 className="section-title">Welcome back, {user.name.split(" ")[0] || seller.storeName}</h1>
      <p className="mt-1 text-[14.5px] text-muted">{seller.storeName}</p>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            {(() => {
              const body = (
                <div className="card h-full p-4 transition-shadow hover:shadow-lift sm:p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><c.icon className="size-[18px]" aria-hidden /></span>
                  <p className="mt-3 text-[12.5px] font-semibold text-muted">{c.label}</p>
                  <p className="mt-0.5 text-[24px] leading-tight font-extrabold tracking-[-0.02em] tabular-nums sm:text-[28px]">{c.value}</p>
                  <p className="mt-1 text-[12.5px] text-muted">{c.sub}</p>
                </div>
              );
              return c.href ? <Link href={c.href} className="block h-full">{body}</Link> : body;
            })()}
          </li>
        ))}
      </ul>

      {low.length > 0 && (
        <div className="mt-6 flex gap-3 rounded-2xl bg-warn-50 p-4 text-[14px] text-warn">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Running low on stock</p>
            <ul className="mt-1 space-y-0.5">
              {low.map((p) => (
                <li key={p.id}>
                  <Link href={`/seller/products/${p.id}`} className="underline underline-offset-2">{p.name}</Link> ({p.qty} left)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="card mt-6">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[17px] font-bold">Recent orders</h2>
          <Link href="/seller/orders" className="flex min-h-10 items-center gap-1 text-[13.5px] font-bold text-brand-700">All orders <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
        {recent.length === 0 ? (
          <p className="border-t border-line px-5 py-10 text-center text-[14px] text-muted">No orders yet. Once shoppers buy your products they show up here.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-[14px]">
                <span>
                  <span className="font-bold">{o.number}</span> <span className="text-muted">· {formatDate(o.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{rupees(o.mine)}</span>
                  <span className="chip bg-canvas text-ink-2 capitalize">{o.fulfilment === "pending" ? "To ship" : o.fulfilment}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
