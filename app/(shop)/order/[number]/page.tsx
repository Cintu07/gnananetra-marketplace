import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Package, PackageCheck, Truck, Home, XCircle, Printer } from "lucide-react";
import { getOrderFull } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { razorpayLive } from "@/lib/razorpay";
import { rupees } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, formatDate } from "@/lib/site";
import RetryPayment from "@/components/shop/RetryPayment";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string; placed?: string }> };

const STEPS = [
  { key: "processing", label: "Confirmed", icon: CheckCircle2 },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, { key, placed }] = await Promise.all([params, searchParams]);
  const order = await getOrderFull({ number: number.toUpperCase() });
  if (!order) notFound();
  const session = await getSession();
  const allowed = (key && key === order.accessKey) || (session && (session.uid === order.userId || session.role !== "customer"));
  if (!allowed) notFound();

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const stopped = ["cancelled", "refunded", "failed"].includes(order.status);
  const awaitingPayment = order.status === "pending" && order.paymentMethod === "razorpay" && order.paymentStatus !== "paid";
  const ship = order.shippingAddress;
  const events = order.events.filter((e) => e.isCustomerVisible);

  return (
    <div className="wrap max-w-5xl py-8">
      {placed && !awaitingPayment && (
        <div className="mb-6 overflow-hidden rounded-3xl bg-night p-6 text-white sm:p-8">
          <CheckCircle2 className="size-10 text-emerald-400" aria-hidden />
          <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Thank you, your order is placed!</h1>
          <p className="mt-2 max-w-xl text-[15px] text-white/75">
            Order <span className="font-bold text-white">{order.number}</span> is confirmed. We&apos;ve emailed the details to {order.email}. We usually dispatch within 1 to 3 working days.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted">Placed on {formatDate(order.createdAt, true)}</p>
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">Order {order.number}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip py-1.5 text-[13px] ${stopped ? "bg-danger-50 text-danger" : order.status === "delivered" ? "bg-success-50 text-success" : "bg-brand-50 text-brand-800"}`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
          {order.paymentStatus === "paid" && (
            <Link href={`/invoice/${order.number}?key=${order.accessKey}`} className="btn-outline btn-sm">
              <Printer className="size-4" aria-hidden /> Invoice
            </Link>
          )}
        </div>
      </div>

      {awaitingPayment && (
        <div className="mt-5 rounded-2xl bg-warn-50 p-5 ring-1 ring-[#f5d9a8]">
          <p className="flex items-center gap-2 text-[15px] font-bold text-warn">
            <Clock className="size-5" aria-hidden /> Payment pending
          </p>
          <p className="mt-1 text-[14px] text-body">Your order is reserved for 45 minutes. Complete the payment to confirm it.</p>
          <RetryPayment
            number={order.number}
            accessKey={order.accessKey}
            total={order.total}
            razorpayOrderId={order.razorpayOrderId}
            keyId={razorpayLive() ? (process.env.RAZORPAY_KEY_ID ?? null) : null}
            customer={{ name: order.name, email: order.email ?? "", phone: order.phone ?? "" }}
          />
        </div>
      )}

      {order.status === "failed" && (
        <div className="mt-5 rounded-2xl bg-danger-50 p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-danger">
            <XCircle className="size-5" aria-hidden /> Payment not completed
          </p>
          <p className="mt-1 text-[14px] text-body">This order expired before payment. Nothing was charged. Please place the order again.</p>
        </div>
      )}

      {!stopped && order.status !== "pending" && order.status !== "on_hold" && (
        <ol className="mt-6 grid grid-cols-4 gap-2 rounded-2xl bg-surface p-5 ring-1 ring-line">
          {STEPS.map((s, i) => {
            const done = i <= stepIndex;
            return (
              <li key={s.key} className="relative flex flex-col items-center text-center">
                {i > 0 && <span className={`absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2 ${i <= stepIndex ? "bg-success" : "bg-line"}`} aria-hidden />}
                <span className={`relative grid size-10 place-items-center rounded-full ${done ? "bg-success text-white" : "bg-canvas text-faint ring-1 ring-line"}`}>
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className={`mt-2 text-[12.5px] font-semibold sm:text-[13.5px] ${done ? "text-ink" : "text-muted"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
          <p className="flex items-center gap-3 text-[14.5px]">
            <PackageCheck className="size-5 text-brand-700" aria-hidden />
            <span>
              {order.trackingCarrier ?? "Courier"} · <span className="font-mono font-semibold">{order.trackingNumber}</span>
            </span>
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener" className="btn-dark btn-sm">
              Track shipment
            </a>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card divide-y divide-line">
          {order.items.map((i) => (
            <div key={i.id} className="flex gap-4 p-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line">
                {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-contain p-1" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[14.5px] font-semibold">{i.name}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {i.qty} × {rupees(i.unitPrice)}
                </p>
              </div>
              <p className="text-[15px] font-bold tabular-nums">{rupees(i.lineTotal)}</p>
            </div>
          ))}
          <dl className="space-y-2 p-5 text-[14.5px]">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{rupees(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>Discount {order.couponCode && `(${order.couponCode})`}</dt>
                <dd className="tabular-nums">−{rupees(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="tabular-nums">{order.shippingFee ? rupees(order.shippingFee) : "Free"}</dd>
            </div>
            {order.codFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Cash on delivery fee</dt>
                <dd className="tabular-nums">{rupees(order.codFee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-[17px] font-extrabold">
              <dt>Total</dt>
              <dd className="tabular-nums">{rupees(order.total)}</dd>
            </div>
            {order.refundedAmount > 0 && (
              <div className="flex justify-between text-[14px] text-success">
                <dt>Refunded</dt>
                <dd className="tabular-nums">{rupees(order.refundedAmount)}</dd>
              </div>
            )}
          </dl>
        </section>

        <aside className="space-y-4">
          <div className="card p-5 text-[14px]">
            <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">Delivering to</h3>
            {ship ? (
              <address className="mt-2 not-italic leading-relaxed">
                <span className="font-bold">{ship.name}</span>
                <br />
                {ship.company && (
                  <>
                    {ship.company}
                    <br />
                  </>
                )}
                {ship.line1}
                {ship.line2 && `, ${ship.line2}`}
                <br />
                {ship.city}, {ship.state} {ship.pincode}
                <br />
                {ship.phone ?? order.phone}
              </address>
            ) : (
              <p className="mt-2 text-muted">No address on file</p>
            )}
            {order.gstin && <p className="mt-3 text-[13px] text-muted">GSTIN: <span className="font-mono font-semibold text-ink">{order.gstin}</span></p>}
          </div>
          <div className="card p-5 text-[14px]">
            <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">Payment</h3>
            <p className="mt-2 font-semibold">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
            <p className="text-muted">
              {order.paymentStatus === "paid"
                ? `Paid${order.paidAt ? ` on ${formatDate(order.paidAt)}` : ""}`
                : order.paymentStatus === "refunded"
                  ? "Refunded"
                  : order.paymentMethod === "cod"
                    ? "Pay on delivery"
                    : "Not paid yet"}
            </p>
          </div>
          {events.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">Updates</h3>
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
                {events.map((e) => (
                  <li key={e.id} className="relative text-[13.5px]">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-brand-700 ring-4 ring-surface" />
                    <p className="text-body">{e.message}</p>
                    <p className="text-[12px] text-muted">{formatDate(e.createdAt, true)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-center text-[13px] text-muted">
            Questions about this order?{" "}
            <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
              Contact us
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
