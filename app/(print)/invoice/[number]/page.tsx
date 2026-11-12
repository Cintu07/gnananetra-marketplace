import { notFound } from "next/navigation";
import { getOrderFull } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { rupees2 } from "@/lib/money";
import { amountInWords, invoiceLines } from "@/lib/invoice";
import { formatDate, PAYMENT_LABEL } from "@/lib/site";
import PrintButton from "@/components/shop/PrintButton";
import Logo from "@/components/shop/Logo";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string }> };

export default async function InvoicePage({ params, searchParams }: Props) {
  const [{ number }, { key }] = await Promise.all([params, searchParams]);
  const order = await getOrderFull({ number: number.toUpperCase() });
  if (!order) notFound();
  const session = await getSession();
  const isStaff = session && session.role !== "customer";
  const allowed = (key && key === order.accessKey) || (session && (session.uid === order.userId || isStaff));
  if (!allowed) notFound();

  const { store, invoice } = await getSettings();
  const ship = order.shippingAddress;
  const bill = order.billingAddress ?? ship;
  const company = order.events.find((e) => e.message.startsWith("Company: "))?.message.slice(9) ?? bill?.company ?? null;
  const homeState = /andhra pradesh/i.test(store.storeAddress) ? "Andhra Pradesh" : "";
  const intra = (ship?.state ?? "").toLowerCase() === homeState.toLowerCase();
  const inv = invoiceLines(order.items, order.discount, order.shippingFee, order.codFee, intra);

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-8 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-[14px] text-muted">Tax invoice for order {order.number}</p>
        <PrintButton />
      </div>
      <article className="rounded-2xl bg-white p-8 text-[12.5px] leading-relaxed text-ink ring-1 ring-line print:rounded-none print:p-0 print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-brand pb-5">
          <div>
            <Logo size={46} />
            <p className="mt-3 font-bold">{store.legalName}</p>
            <p className="max-w-xs text-muted">{store.storeAddress}</p>
            <p className="text-muted">
              {store.phone} · {store.email}
            </p>
            {store.gstin && <p className="mt-1 font-semibold">GSTIN: {store.gstin}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-[22px] font-extrabold tracking-tight">TAX INVOICE</h1>
            <p className="mt-2">
              Invoice no: <span className="font-semibold">{order.number}</span>
            </p>
            <p>Date: {formatDate(order.paidAt ?? order.createdAt)}</p>
            <p>Order date: {formatDate(order.createdAt)}</p>
            <p>Payment: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
            <p>Place of supply: {ship?.state ?? "-"}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-5 sm:grid-cols-2">
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Bill to</h2>
            <p className="mt-1 font-semibold">{company || bill?.name || order.name}</p>
            {company && <p>{bill?.name}</p>}
            {bill && (
              <p className="text-muted">
                {bill.line1}
                {bill.line2 && `, ${bill.line2}`}, {bill.city}, {bill.state} {bill.pincode}
              </p>
            )}
            {order.gstin && <p className="mt-1 font-semibold">GSTIN: {order.gstin}</p>}
            <p className="text-muted">
              {order.phone} {order.email && `· ${order.email}`}
            </p>
          </div>
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Ship to</h2>
            {ship && (
              <>
                <p className="mt-1 font-semibold">{ship.name}</p>
                <p className="text-muted">
                  {ship.line1}
                  {ship.line2 && `, ${ship.line2}`}, {ship.city}, {ship.state} {ship.pincode}
                </p>
              </>
            )}
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="bg-canvas text-[11px] tracking-wide text-muted uppercase print:bg-[#f4f5f7]">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2">HSN</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Taxable value</th>
              <th className="px-2 py-2 text-right">GST</th>
              {intra ? (
                <>
                  <th className="px-2 py-2 text-right">CGST</th>
                  <th className="px-2 py-2 text-right">SGST</th>
                </>
              ) : (
                <th className="px-2 py-2 text-right">IGST</th>
              )}
              <th className="px-2 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.rows.map((r, i) => (
              <tr key={i} className="border-b border-line align-top">
                <td className="px-2 py-2.5">{i + 1}</td>
                <td className="px-2 py-2.5 font-medium">{r.name}</td>
                <td className="px-2 py-2.5">{r.hsn ?? "-"}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.qty}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{rupees2(r.taxable)}</td>
                <td className="px-2 py-2.5 text-right">{r.gstRate}%</td>
                {intra ? (
                  <>
                    <td className="px-2 py-2.5 text-right tabular-nums">{rupees2(r.cgst)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{rupees2(r.sgst)}</td>
                  </>
                ) : (
                  <td className="px-2 py-2.5 text-right tabular-nums">{rupees2(r.igst)}</td>
                )}
                <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{rupees2(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-5 flex flex-wrap justify-between gap-6">
          <div className="max-w-sm">
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Amount in words</p>
            <p className="mt-1 font-semibold">{amountInWords(inv.total)}</p>
            {order.discount > 0 && <p className="mt-2 text-muted">Includes discount of {rupees2(order.discount)}{order.couponCode ? ` (${order.couponCode})` : ""}.</p>}
          </div>
          <dl className="w-64 space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted">Taxable value</dt>
              <dd className="tabular-nums">{rupees2(inv.taxable)}</dd>
            </div>
            {intra ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted">CGST</dt>
                  <dd className="tabular-nums">{rupees2(inv.cgst)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">SGST</dt>
                  <dd className="tabular-nums">{rupees2(inv.sgst)}</dd>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <dt className="text-muted">IGST</dt>
                <dd className="tabular-nums">{rupees2(inv.igst)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-ink pt-1.5 text-[15px] font-extrabold">
              <dt>Total</dt>
              <dd className="tabular-nums">{rupees2(inv.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-5">
          <p className="max-w-md text-[11.5px] text-muted">{invoice.terms}</p>
          <div className="text-right">
            <div className="h-12" />
            <p className="font-semibold">{invoice.signatory}</p>
            <p className="text-[11px] text-muted">Authorised signatory</p>
          </div>
        </footer>
        <p className="mt-6 text-center text-[11px] text-faint">This is a computer generated invoice.</p>
      </article>
    </div>
  );
}
