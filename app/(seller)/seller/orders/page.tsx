import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { PackageCheck, Truck } from "lucide-react";
import { deliverMyItems, shipMyItems } from "@/app/(seller)/seller/actions";
import { requireSeller } from "@/lib/seller-auth";
import { chunks, db, schema as s } from "@/lib/db";
import { rupees } from "@/lib/money";
import { PAYMENT_LABEL, formatDate } from "@/lib/site";

export const metadata = { title: "Orders" };

const VIEWS = [
  { key: "to-ship", label: "To ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "all", label: "All" },
];
const CARRIERS = ["India Post", "Delhivery", "DTDC", "Blue Dart", "Ecom Express", "Xpressbees", "Other"];

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ view?: string; error?: string }> }) {
  const { seller } = await requireSeller();
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "to-ship";

  const mine = await db
    .select({ item: s.orderItems, orderId: s.orders.id })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.sellerId, seller.id), sql`${s.orders.status} not in ('pending', 'failed')`))
    .orderBy(desc(s.orders.createdAt))
    .limit(400);
  const byOrder = new Map<number, (typeof mine)[number]["item"][]>();
  for (const m of mine) byOrder.set(m.orderId, [...(byOrder.get(m.orderId) ?? []), m.item]);

  const ids = [...byOrder.keys()];
  const orders: (typeof s.orders.$inferSelect)[] = [];
  for (const part of chunks(ids)) orders.push(...(await db.select().from(s.orders).where(inArray(s.orders.id, part))));
  orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const stage = (items: { fulfilment: string }[]) => {
    const live = items.filter((i) => i.fulfilment !== "cancelled");
    if (!live.length) return "cancelled";
    if (live.some((i) => i.fulfilment === "pending")) return "to-ship";
    if (live.some((i) => i.fulfilment === "shipped")) return "shipped";
    return "delivered";
  };
  const rows = orders
    .map((o) => ({ o, items: byOrder.get(o.id)!, stage: o.status === "cancelled" ? "cancelled" : stage(byOrder.get(o.id)!) }))
    .filter((r) => (view === "all" ? true : r.stage === view));
  const counts = Object.fromEntries(VIEWS.map((v) => [v.key, orders.filter((o) => (o.status === "cancelled" ? "cancelled" : stage(byOrder.get(o.id)!)) === v.key).length]));

  return (
    <div>
      <p className="eyebrow mb-1.5">Fulfilment</p>
      <h1 className="section-title">Orders</h1>
      {sp.error && <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-4 py-3 text-[14px] text-danger">{sp.error}</p>}

      <div className="no-scrollbar -mx-4 mt-5 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/seller/orders?view=${v.key}`} role="tab" aria-selected={view === v.key} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold ${view === v.key ? "bg-ink text-white" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-canvas"}`}>
            {v.label}
            {v.key !== "all" && <span className="opacity-60 tabular-nums">{counts[v.key] ?? 0}</span>}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card mt-6 grid place-items-center px-6 py-16 text-center">
          <PackageCheck className="size-10 text-faint" aria-hidden />
          <p className="mt-3 text-[17px] font-bold">{view === "to-ship" ? "Nothing waiting to ship" : "No orders here"}</p>
          <p className="mt-1 max-w-sm text-[14px] text-muted">New orders for your products appear here the moment a shopper pays or chooses cash on delivery.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map(({ o, items, stage: st }) => {
            const total = items.reduce((n, i) => n + i.lineTotal, 0);
            const ship = o.shippingAddress;
            return (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/60 px-5 py-3 text-[13.5px]">
                  <span><span className="text-[15px] font-bold">{o.number}</span> <span className="text-muted">· {formatDate(o.createdAt)} · {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</span></span>
                  <span className="chip bg-surface text-ink-2 capitalize ring-1 ring-line">{st === "to-ship" ? "To ship" : st}</span>
                </div>
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <ul className="space-y-3">
                    {items.map((i) => (
                      <li key={i.id} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {i.image ? <img src={i.image} alt="" className="size-14 shrink-0 rounded-lg bg-canvas object-contain p-1 ring-1 ring-line" /> : <span className="size-14 shrink-0 rounded-lg bg-canvas" />}
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-[14px] leading-snug font-semibold">{i.name}</span>
                          <span className="text-[13px] text-muted tabular-nums">{i.qty} × {rupees(i.unitPrice)}</span>
                        </span>
                        <span className="text-[14px] font-bold tabular-nums">{rupees(i.lineTotal)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t border-line pt-3 text-[14px]">
                      <span className="text-muted">Your items</span>
                      <span className="font-extrabold tabular-nums">{rupees(total)}</span>
                    </li>
                  </ul>

                  <div className="space-y-4 text-[13.5px]">
                    {ship && (
                      <div>
                        <p className="text-[12px] font-bold tracking-wide text-faint uppercase">Ship to</p>
                        <p className="mt-1 leading-relaxed">
                          <span className="font-semibold">{ship.name}</span>
                          <br />
                          {ship.line1}
                          {ship.line2 ? `, ${ship.line2}` : ""}
                          <br />
                          {ship.city}, {ship.state} {ship.pincode}
                          <br />
                          <span className="text-muted">{o.phone}</span>
                        </p>
                      </div>
                    )}
                    {st === "to-ship" && (
                      <form action={shipMyItems} className="space-y-2.5">
                        <input type="hidden" name="orderId" value={o.id} />
                        <label className="label" htmlFor={`c${o.id}`}>Courier</label>
                        <select id={`c${o.id}`} name="carrier" className="field !py-2.5" defaultValue="Delhivery">
                          {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <label className="label" htmlFor={`t${o.id}`}>Tracking number</label>
                        <input id={`t${o.id}`} name="tracking" required maxLength={80} className="field !py-2.5" placeholder="e.g. 1234567890" />
                        <button className="btn-primary w-full"><Truck className="size-4" aria-hidden /> Mark as shipped</button>
                      </form>
                    )}
                    {st === "shipped" && (
                      <div className="space-y-2.5">
                        <p className="text-muted">Tracking: <span className="font-semibold text-ink">{items.find((i) => i.trackingNumber)?.trackingCarrier} {items.find((i) => i.trackingNumber)?.trackingNumber}</span></p>
                        <form action={deliverMyItems}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <button className="btn-outline w-full"><PackageCheck className="size-4" aria-hidden /> Mark as delivered</button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
