import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { pdfRupees, rupees } from "@/lib/money";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel, StatCard } from "@/components/admin/panel";
import BarChart from "@/components/admin/bar-chart";
import SegmentBar from "@/components/admin/segment-bar";
import ReportExport from "@/components/admin/report-export";
import { cn } from "@/lib/cn";

export const metadata = { title: "Reports" };

const PERIODS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
  { days: 0, label: "All time" },
];

function Breakdown({ title, rows, total }: { title: string; rows: { label: string; value: number; n?: number }[]; total: number }) {
  return (
    <Panel className="flex flex-col gap-3">
      <h2 className="text-[14px]">{title}</h2>
      {rows.length === 0 ? (
        <p className="caption-style py-6 text-center text-subtle">No sales in this period.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.label} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 tabular-nums">
                  {rupees(r.value)}
                  {r.n !== undefined && <span className="caption-style ml-1.5 text-subtle">×{r.n}</span>}
                </span>
              </span>
              <SegmentBar percent={total ? (r.value / total) * 100 : 0} tone="primary" segments={24} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const days = Number((await searchParams).days ?? 90);
  // times are stored in milliseconds; India is UTC+5:30 (19,800,000 ms) for day and month buckets
  const since = days > 0 ? sql`and o.created_at > ${Date.now() - days * 86_400_000}` : sql``;
  const ok = sql`o.status not in ('cancelled','failed','pending','refunded')`;
  const q = <T,>(query: ReturnType<typeof sql>) => db.all<T>(query);

  const [kpi] = await q<{ revenue: number; orders: number; units: number; refunds: number; cancelled: number; customers: number }>(sql`
    select coalesce(sum(case when ${ok} then o.total - o.refunded_amount end), 0) as revenue,
           count(case when ${ok} then 1 end) as orders,
           coalesce((select sum(oi.qty) from order_items oi join orders o on o.id = oi.order_id where ${ok} ${since}), 0) as units,
           coalesce(sum(o.refunded_amount), 0) as refunds,
           count(case when o.status in ('cancelled','failed') then 1 end) as cancelled,
           count(distinct case when ${ok} then o.user_id end) as customers
    from orders o where 1 = 1 ${since}`);

  const bucket = days > 0 && days <= 90 ? "day" : "month";
  const bucketSql =
    bucket === "day" ? sql`date((o.created_at + 19800000) / 1000, 'unixepoch')` : sql`strftime('%Y-%m-01', (o.created_at + 19800000) / 1000, 'unixepoch')`;
  const series = await q<{ label: string; value: number; n: number }>(sql`
    select ${bucketSql} as label, coalesce(sum(o.total - o.refunded_amount), 0) as value, count(*) as n
    from orders o where ${ok} ${since} group by 1 order by 1`);

  const byCategory = await q<{ label: string; value: number; n: number }>(sql`
    select coalesce((
             select c.name from product_categories pc join categories c on c.id = pc.category_id
             where pc.product_id = oi.product_id and c.parent_id is null limit 1
           ), 'Uncategorised') as label,
           sum(oi.line_total) as value, sum(oi.qty) as n
    from order_items oi join orders o on o.id = oi.order_id
    where ${ok} ${since} group by 1 order by 2 desc limit 8`);

  const byBrand = await q<{ label: string; value: number; n: number }>(sql`
    select coalesce(b.name, 'No brand') as label, sum(oi.line_total) as value, sum(oi.qty) as n
    from order_items oi join orders o on o.id = oi.order_id
    left join products p on p.id = oi.product_id left join brands b on b.id = p.brand_id
    where ${ok} ${since} group by 1 order by 2 desc limit 8`);

  const byPayment = await q<{ label: string; value: number; n: number }>(sql`
    select case when o.payment_method = 'cod' then 'Cash on delivery' else 'Online' end as label,
           sum(o.total) as value, count(*) as n
    from orders o where ${ok} ${since} group by 1 order by 2 desc`);

  const byState = await q<{ label: string; value: number; n: number }>(sql`
    select coalesce(nullif(json_extract(o.shipping_address, '$.state'), ''), 'Unknown') as label, sum(o.total) as value, count(*) as n
    from orders o where ${ok} ${since} group by 1 order by 2 desc limit 8`);

  const topProducts = await q<{ label: string; value: number; n: number }>(sql`
    select oi.name as label, sum(oi.line_total) as value, sum(oi.qty) as n
    from order_items oi join orders o on o.id = oi.order_id where ${ok} ${since}
    group by oi.name order by 2 desc limit 10`);

  const topCustomers = await q<{ label: string; value: number; n: number }>(sql`
    select coalesce(nullif(o.name, ''), o.email, 'Guest') as label, sum(o.total) as value, count(*) as n
    from orders o where ${ok} ${since} group by 1 order by 2 desc limit 8`);

  const [codRisk] = await q<{ placed: number; cancelled: number }>(sql`
    select count(*) as placed, count(case when o.status in ('cancelled','failed') then 1 end) as cancelled
    from orders o where o.payment_method = 'cod' ${since}`);

  const aov = kpi.orders ? Math.round(kpi.revenue / kpi.orders) : 0;

  return (
    <>
      <PageHeader title="Reports" />
      <Toolbar
        actions={
          <ReportExport
            period={PERIODS.find((p) => p.days === days)?.label ?? `${days} days`}
            bucket={bucket}
            series={series}
            kpis={[
              { label: "Sales", value: pdfRupees(kpi.revenue), hint: `after ${pdfRupees(kpi.refunds)} refunds` },
              { label: "Orders", value: String(kpi.orders), hint: `${kpi.cancelled} cancelled or unpaid` },
              { label: "Average order", value: pdfRupees(aov), hint: `${kpi.units} units sold` },
              { label: "Buying customers", value: String(kpi.customers), hint: codRisk.placed ? `${Math.round((codRisk.cancelled / codRisk.placed) * 100)}% of COD orders cancelled` : "no COD orders" },
            ]}
            breakdowns={[
              { title: "Top products", rows: topProducts, unit: "Units" },
              { title: "By department", rows: byCategory, unit: "Units" },
              { title: "By brand", rows: byBrand, unit: "Units" },
              { title: "Top customers", rows: topCustomers, unit: "Orders" },
              { title: "Payment method", rows: byPayment, unit: "Orders" },
              { title: "Where orders go", rows: byState, unit: "Orders" },
            ]}
          />
        }
      >
        <div className="flex gap-1 rounded-full border border-line-strong bg-secondary p-0.5">
          {PERIODS.map((p) => (
            <Link key={p.days} href={`/admin/reports?days=${p.days}`} className={cn("caption-style rounded-full px-3 py-1.5", days === p.days ? "bg-foreground text-white" : "text-soft hover:bg-muted")}>
              {p.label}
            </Link>
          ))}
        </div>
      </Toolbar>
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Sales" value={rupees(kpi.revenue)} hint={`after ${rupees(kpi.refunds)} refunds`} accent />
          <StatCard label="Orders" value={kpi.orders} hint={`${kpi.cancelled} cancelled or unpaid`} />
          <StatCard label="Average order" value={rupees(aov)} hint={`${kpi.units} units sold`} />
          <StatCard label="Buying customers" value={kpi.customers} hint={codRisk.placed ? `${Math.round((codRisk.cancelled / codRisk.placed) * 100)}% of COD orders cancelled` : "no COD orders"} />
        </div>
        <Panel className="flex flex-col gap-3">
          <h2 className="text-[14px]">Sales by {bucket}</h2>
          {series.length ? (
            <BarChart data={series.map((s) => ({ label: s.label, value: s.value, sub: s.n }))} />
          ) : (
            <p className="caption-style py-10 text-center text-subtle">No confirmed sales in this period.</p>
          )}
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Breakdown title="Top products" rows={topProducts} total={kpi.revenue} />
          <Breakdown title="By department" rows={byCategory} total={kpi.revenue} />
          <Breakdown title="By brand" rows={byBrand} total={kpi.revenue} />
          <Breakdown title="Top customers" rows={topCustomers} total={kpi.revenue} />
          <Breakdown title="Payment method" rows={byPayment} total={kpi.revenue} />
          <Breakdown title="Where orders go" rows={byState} total={kpi.revenue} />
        </div>
      </PageBody>
    </>
  );
}
