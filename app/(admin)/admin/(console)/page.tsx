import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { ArrowUpRight, IndianRupee, Package, ShoppingBag, Users, AlertTriangle, Star, MessageSquare, BellRing, Truck } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { expireStaleOrders } from "@/lib/orders";
import { rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";
import PageHeader from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel, StatCard } from "@/components/admin/panel";
import { OrderStatusTag } from "@/components/admin/status-tag";
import BarChart from "@/components/admin/bar-chart";

export const metadata = { title: "Dashboard" };

const CONFIRMED = sql`status not in ('cancelled', 'failed', 'pending', 'refunded')`;

function delta(now: number, before: number) {
  if (!before) return now ? "new this period" : "no change";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs previous 30 days`;
}

export default async function Dashboard() {
  const admin = await requireAdmin();
  await expireStaleOrders();

  // times are stored as milliseconds; India is UTC+5:30, so a day bucket shifts by 19,800,000 ms
  const DAY = 86_400_000;
  const now = Date.now();
  const d30 = now - 30 * DAY;
  const d60 = now - 60 * DAY;
  const d90 = now - 90 * DAY;
  const istDay = (col: ReturnType<typeof sql>) => sql`date((${col} + 19800000) / 1000, 'unixepoch')`;

  const [kpi] = await db.all<{
    rev30: number;
    rev_prev: number;
    orders30: number;
    orders_prev: number;
    to_ship: number;
    awaiting: number;
    customers: number;
    new_customers: number;
    published: number;
    out_of_stock: number;
    low_stock: number;
    reviews_pending: number;
    inquiries_new: number;
    stock_alerts: number;
    cod_to_collect: number;
  }>(sql`
    select
      coalesce((select sum(total - refunded_amount) from orders where ${CONFIRMED} and created_at > ${d30}), 0) as rev30,
      coalesce((select sum(total - refunded_amount) from orders where ${CONFIRMED} and created_at > ${d60} and created_at <= ${d30}), 0) as rev_prev,
      (select count(*) from orders where ${CONFIRMED} and created_at > ${d30}) as orders30,
      (select count(*) from orders where ${CONFIRMED} and created_at > ${d60} and created_at <= ${d30}) as orders_prev,
      (select count(*) from orders where status in ('processing', 'packed')) as to_ship,
      (select count(*) from orders where status = 'pending') as awaiting,
      (select count(*) from users where role = 'customer') as customers,
      (select count(*) from users where role = 'customer' and created_at > ${d30}) as new_customers,
      (select count(*) from products where status = 'published') as published,
      (select count(*) from products where status = 'published' and stock_status = 'out_of_stock') as out_of_stock,
      (select count(*) from products where status = 'published' and stock_qty is not null and stock_qty <= low_stock_at) as low_stock,
      (select count(*) from reviews where status = 'pending') as reviews_pending,
      (select count(*) from inquiries where status = 'new') as inquiries_new,
      (select count(*) from stock_alerts where notified_at is null) as stock_alerts,
      coalesce((select sum(total) from orders where payment_method = 'cod' and payment_status = 'unpaid' and status in ('processing','packed','shipped')), 0) as cod_to_collect
  `);

  // one bar per day for the last 30 days (India time), days without sales included
  const byDay = await db.all<{ day: string; revenue: number; orders: number }>(sql`
    select ${istDay(sql`created_at`)} as day, coalesce(sum(total - refunded_amount), 0) as revenue, count(*) as orders
    from orders where ${CONFIRMED} and created_at > ${now - 31 * DAY}
    group by day`);
  const daily = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(now + 19_800_000 - (29 - i) * DAY).toISOString().slice(0, 10);
    const hit = byDay.find((d) => d.day === day);
    return { day, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0 };
  });

  const recent = await db.select().from(s.orders).orderBy(desc(s.orders.createdAt)).limit(8);

  const top = await db.all<{ name: string; product_id: number | null; qty: number; revenue: number }>(sql`
    select oi.name, oi.product_id, sum(oi.qty) as qty, sum(oi.line_total) as revenue
    from order_items oi join orders o on o.id = oi.order_id
    where o.status not in ('cancelled','failed','pending','refunded') and o.created_at > ${d90}
    group by oi.name, oi.product_id order by revenue desc limit 6`);

  const attention = [
    { n: kpi.to_ship, label: "orders to pack and ship", href: "/admin/orders?view=to-ship", icon: Truck },
    { n: kpi.awaiting, label: "orders awaiting online payment", href: "/admin/orders?view=pending", icon: ShoppingBag },
    { n: kpi.inquiries_new, label: "new inquiries and bulk quotes", href: "/admin/inquiries", icon: MessageSquare },
    { n: kpi.reviews_pending, label: "reviews waiting for approval", href: "/admin/reviews", icon: Star },
    { n: kpi.stock_alerts, label: "shoppers waiting for restock", href: "/admin/stock-alerts", icon: BellRing },
    { n: kpi.low_stock, label: "products low on stock", href: "/admin/inventory", icon: AlertTriangle },
  ].filter((a) => a.n > 0);

  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader title="Dashboard" chip={{ label: `${greet}, ${admin.name.split(" ")[0] || "there"}` }} />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Sales · 30 days" value={rupees(kpi.rev30)} hint={delta(kpi.rev30, kpi.rev_prev)} icon={<IndianRupee />} accent />
          <StatCard label="Orders · 30 days" value={kpi.orders30} hint={delta(kpi.orders30, kpi.orders_prev)} icon={<ShoppingBag />} />
          <StatCard label="Customers" value={kpi.customers} hint={`${kpi.new_customers} new in 30 days`} icon={<Users />} />
          <StatCard label="Live products" value={kpi.published} hint={`${kpi.out_of_stock} out of stock`} icon={<Package />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px]">Sales, last 30 days</h2>
              <Link href="/admin/reports" className="caption-style flex items-center gap-1 text-subtle hover:text-foreground">
                Reports <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            </div>
            <BarChart data={daily.map((d) => ({ label: d.day, value: d.revenue, sub: d.orders }))} />
          </Panel>
          <Panel className="flex flex-col gap-3">
            <h2 className="text-[14px]">Needs attention</h2>
            {attention.length === 0 ? (
              <p className="caption-style py-8 text-center text-subtle">All caught up. Nothing waiting on you.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                      <span className="grid size-8 place-items-center rounded-lg bg-[#FFF7ED] text-primary">
                        <a.icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="flex-1 text-[13.5px]">
                        <span className="font-semibold tabular-nums">{a.n}</span> {a.label}
                      </span>
                      <ArrowUpRight className="size-3.5 text-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {kpi.cod_to_collect > 0 && <p className="caption-style mt-auto border-t border-border pt-3 text-subtle">{rupees(kpi.cod_to_collect)} cash on delivery still to collect</p>}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Panel className="p-0">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-[14px]">Latest orders</h2>
              <Link href="/admin/orders" className="caption-style flex items-center gap-1 text-subtle hover:text-foreground">
                All orders <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            </div>
            <ul className="divide-y divide-border border-t border-border">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/60">
                    <span className="w-[86px] font-mono text-[12.5px]">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{o.name || o.email}</span>
                    <OrderStatusTag status={o.status} />
                    <span className="caption-style w-[84px] text-subtle">{formatDate(o.createdAt)}</span>
                    <span className="w-[84px] text-right text-[13.5px] font-medium tabular-nums">{rupees(o.total)}</span>
                  </Link>
                </li>
              ))}
              {!recent.length && <li className="caption-style p-8 text-center text-subtle">No orders yet.</li>}
            </ul>
          </Panel>
          <Panel className="flex flex-col gap-3">
            <h2 className="text-[14px]">Best sellers · 90 days</h2>
            {top.length === 0 ? (
              <p className="caption-style py-8 text-center text-subtle">Sales will show here.</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {top.map((t, i) => (
                  <li key={`${t.name}-${i}`} className="flex items-center gap-3">
                    <span className="caption-style w-4 text-subtle">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">
                      {t.product_id ? (
                        <Link href={`/admin/products/${t.product_id}`} className="hover:underline">
                          {t.name}
                        </Link>
                      ) : (
                        t.name
                      )}
                    </span>
                    <span className="caption-style text-subtle">×{t.qty}</span>
                    <span className="w-20 text-right text-[13px] font-medium tabular-nums">{rupees(t.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
