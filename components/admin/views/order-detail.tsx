"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Truck, PackageCheck, CheckCircle2, XCircle, RefreshCcw, Search, Banknote, ExternalLink, Copy } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel, DetailSection, KeyValue } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input, Textarea } from "@/components/admin/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Switch } from "@/components/admin/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { OrderStatusTag, PaymentTag } from "@/components/admin/status-tag";
import Tag from "@/components/admin/ui/tag";
import { RupeeInput } from "@/components/admin/rupee-input";
import { useRun } from "@/components/admin/use-run";
import { addOrderNote, checkPayment, markCodCollected, refundOrderAction, saveTracking, updateOrderStatus } from "@/app/(admin)/admin/actions";
import { rupees } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, formatDate } from "@/lib/site";
import type { Address } from "@/db/schema";

type Order = {
  id: number;
  number: string;
  userId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  codFee: number;
  total: number;
  refundedAmount: number;
  couponCode: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  customerNote: string | null;
  source: string;
  accessKey: string;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: { id: number; productId: number | null; name: string; sku: string | null; image: string | null; unitPrice: number; qty: number; lineTotal: number; gstRate: number; sellerName: string | null; fulfilment: string; trackingCarrier: string | null; trackingNumber: string | null; commissionPct: number }[];
  events: { id: number; kind: string; message: string; actor: string | null; isCustomerVisible: boolean; createdAt: string }[];
};

const CARRIERS = ["DTDC", "Delhivery", "Blue Dart", "India Post", "Professional Couriers", "Shree Maruti", "Ekart", "Own delivery"];

function AddressBlock({ a }: { a: Address | null }) {
  if (!a) return <p className="caption-style text-subtle">Not given</p>;
  return (
    <address className="text-[13.5px] leading-relaxed not-italic">
      <span className="font-medium">{a.name}</span>
      {a.company && <span className="block">{a.company}</span>}
      <span className="block text-soft">
        {a.line1}
        {a.line2 && `, ${a.line2}`}
        {a.landmark && `, near ${a.landmark}`}
      </span>
      <span className="block text-soft">
        {a.city}, {a.state} {a.pincode}
      </span>
      {a.phone && <span className="block text-soft">{a.phone}</span>}
    </address>
  );
}

export default function OrderDetail({ order, customerOrders, gatewayLive }: { order: Order; customerOrders: number; gatewayLive: boolean }) {
  const { run, busy, toast, toastNode } = useRun();
  const [shipOpen, setShipOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [carrier, setCarrier] = useState(order.trackingCarrier ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState(order.total - order.refundedAmount);
  const [refundReason, setRefundReason] = useState("");
  const [statusPick, setStatusPick] = useState(order.status);

  const s = order.status;
  const canRefund = order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded";
  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast("Copied"));
  const shipAddr = order.shippingAddress;
  const addressText = shipAddr ? [shipAddr.name, shipAddr.company, shipAddr.line1, shipAddr.line2, `${shipAddr.city}, ${shipAddr.state} ${shipAddr.pincode}`, shipAddr.phone ?? order.phone].filter(Boolean).join("\n") : "";

  return (
    <>
      <PageHeader title={`Order ${order.number}`} chip={{ label: ORDER_STATUS_LABEL[s] ?? s, tone: ["cancelled", "failed", "refunded"].includes(s) ? "muted" : s === "pending" || s === "on_hold" ? "warn" : "live" }} />
      <PageBody className="max-w-[1240px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button href="/admin/orders" variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" aria-hidden /> All orders
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {s === "pending" && order.paymentMethod === "razorpay" && (
              <Button variant="secondary" size="sm" disabled={busy || !gatewayLive} title={gatewayLive ? undefined : "Add Razorpay keys first"} onClick={() => run(() => checkPayment(order.id))}>
                <Search className="size-3.5" aria-hidden /> Check payment with Razorpay
              </Button>
            )}
            {s === "processing" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, "packed", { notify: false }))}>
                <PackageCheck className="size-3.5" aria-hidden /> Mark packed
              </Button>
            )}
            {(s === "processing" || s === "packed" || s === "on_hold") && (
              <Button variant="primary" size="sm" disabled={busy} onClick={() => setShipOpen(true)}>
                <Truck className="size-3.5" aria-hidden /> Ship order
              </Button>
            )}
            {s === "shipped" && (
              <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => updateOrderStatus(order.id, "delivered"))}>
                <CheckCircle2 className="size-3.5" aria-hidden /> Mark delivered
              </Button>
            )}
            {order.paymentMethod === "cod" && order.paymentStatus === "unpaid" && ["shipped", "delivered", "processing", "packed"].includes(s) && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => markCodCollected(order.id))}>
                <Banknote className="size-3.5" aria-hidden /> Cash collected
              </Button>
            )}
            {canRefund && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setRefundOpen(true)}>
                <RefreshCcw className="size-3.5" aria-hidden /> Refund
              </Button>
            )}
            {["pending", "processing", "packed", "on_hold"].includes(s) && (
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Cancel order ${order.number}? Held stock goes back on sale and the customer is emailed.${canRefund ? " Refund the payment separately." : ""}`)) run(() => updateOrderStatus(order.id, "cancelled"));
                }}
              >
                <XCircle className="size-3.5" aria-hidden /> Cancel
              </Button>
            )}
            <Button href={`/invoice/${order.number}`} variant="secondary" size="sm" target="_blank">
              <Printer className="size-3.5" aria-hidden /> Invoice
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-4">
                <h2 className="text-[14px]">Items</h2>
                <span className="caption-style leading-snug text-subtle">
                  Placed {formatDate(order.createdAt, true)}
                  {order.source === "wordpress" && " · imported from the old site"}
                </span>
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {order.items.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                    <span className="size-12 shrink-0 overflow-hidden rounded-md border border-border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {i.image && <img src={i.image} alt="" className="size-full object-contain p-0.5" />}
                    </span>
                    <span className="flex min-w-0 flex-1 basis-[calc(100%-60px)] flex-col gap-1 sm:basis-auto">
                      {i.productId ? (
                        <Link href={`/admin/products/${i.productId}`} className="truncate text-[13.5px] hover:underline">
                          {i.name}
                        </Link>
                      ) : (
                        <span className="truncate text-[13.5px]">{i.name}</span>
                      )}
                      <span className="caption-style text-subtle">
                        {i.sku && `SKU ${i.sku} · `}GST {i.gstRate}%
                      </span>
                      <span className="caption-style text-subtle">
                        {i.sellerName ? `Sold by ${i.sellerName} · ${i.commissionPct}% commission` : "Sold by Gnananetra"}
                        {i.sellerName && ` · ${i.fulfilment === "pending" ? "waiting to ship" : i.fulfilment}${i.trackingNumber ? ` (${i.trackingCarrier ?? "courier"} ${i.trackingNumber})` : ""}`}
                      </span>
                    </span>
                    <span className="caption-style ml-[60px] text-soft tabular-nums sm:ml-0">
                      {i.qty} × {rupees(i.unitPrice)}
                    </span>
                    <span className="ml-auto w-24 text-right text-[13.5px] font-medium tabular-nums">{rupees(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 p-4">
                <KeyValue label="Subtotal">{rupees(order.subtotal)}</KeyValue>
                {order.discount > 0 && <KeyValue label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}>−{rupees(order.discount)}</KeyValue>}
                <KeyValue label="Delivery">{order.shippingFee ? rupees(order.shippingFee) : "Free"}</KeyValue>
                {order.codFee > 0 && <KeyValue label="COD fee">{rupees(order.codFee)}</KeyValue>}
                <KeyValue label="Total" strong>
                  {rupees(order.total)}
                </KeyValue>
                {order.refundedAmount > 0 && <KeyValue label="Refunded">−{rupees(order.refundedAmount)}</KeyValue>}
              </div>
            </Panel>

            {order.customerNote && (
              <Panel className="border-l-4 border-l-primary">
                <p className="caption-style mb-2 text-subtle">Customer note</p>
                <p className="text-[14px]">{order.customerNote}</p>
              </Panel>
            )}

            <Panel className="flex flex-col gap-4">
              <h2 className="text-[14px]">Timeline</h2>
              <div className="flex flex-col gap-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (call log, packing remark, courier issue…)" className="min-h-[64px]" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="caption-style flex items-center gap-2 text-soft">
                    <Switch checked={noteVisible} onCheckedChange={setNoteVisible} /> Show this note to the customer
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy || !note.trim()}
                    onClick={async () => {
                      const r = await run(() => addOrderNote(order.id, note, noteVisible));
                      if (r.ok) setNote("");
                    }}
                  >
                    Add note
                  </Button>
                </div>
              </div>
              <ol className="flex flex-col gap-3 border-l border-line-strong pl-4">
                {order.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className={`absolute top-1 -left-[21px] size-2.5 rounded-full ring-4 ring-card ${e.kind === "paid" ? "bg-status" : e.kind === "refund" || e.kind === "payment_failed" ? "bg-danger" : "bg-faint"}`} />
                    <p className="text-[13.5px]">{e.message}</p>
                    <p className="caption-style mt-1 text-subtle">
                      {formatDate(e.createdAt, true)} · {e.actor ?? "system"}
                      {e.isCustomerVisible && " · visible to customer"}
                    </p>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel className="p-0">
              <DetailSection title="Customer">
                <div className="flex flex-col gap-1.5 text-[13.5px]">
                  <span className="font-medium">{order.name}</span>
                  {order.email && (
                    <a href={`mailto:${order.email}`} className="text-soft hover:underline">
                      {order.email}
                    </a>
                  )}
                  {order.phone && (
                    <span className="flex items-center gap-2">
                      <a href={`tel:${order.phone}`} className="text-soft hover:underline">
                        {order.phone}
                      </a>
                      <a href={`https://wa.me/${order.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noopener" className="caption-style text-primary hover:underline">
                        WhatsApp
                      </a>
                    </span>
                  )}
                  {order.userId && (
                    <Link href={`/admin/customers?open=${order.userId}`} className="caption-style mt-1 text-primary hover:underline">
                      {customerOrders} order{customerOrders === 1 ? "" : "s"} from this customer
                    </Link>
                  )}
                </div>
              </DetailSection>
              <DetailSection
                title="Ship to"
                action={
                  addressText ? (
                    <Button variant="ghost" size="sm" onClick={() => copy(addressText)}>
                      <Copy className="size-3" aria-hidden /> Copy
                    </Button>
                  ) : undefined
                }
              >
                <AddressBlock a={order.shippingAddress} />
              </DetailSection>
              {(order.gstin || (order.billingAddress && JSON.stringify(order.billingAddress) !== JSON.stringify(order.shippingAddress))) && (
                <DetailSection title="Billing">
                  <AddressBlock a={order.billingAddress} />
                  {order.gstin && <p className="font-mono text-[13px]">GSTIN {order.gstin}</p>}
                </DetailSection>
              )}
              <DetailSection title="Payment">
                <div className="flex flex-col gap-2">
                  <KeyValue label="Method">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</KeyValue>
                  <KeyValue label="Status">
                    <PaymentTag status={order.paymentStatus} method={order.paymentMethod} orderStatus={order.status} />
                  </KeyValue>
                  {order.paidAt && <KeyValue label="Paid on">{formatDate(order.paidAt, true)}</KeyValue>}
                  {order.razorpayPaymentId && (
                    <KeyValue label="Payment id">
                      <span className="font-mono text-[12px]">{order.razorpayPaymentId}</span>
                    </KeyValue>
                  )}
                  {order.razorpayOrderId && (
                    <KeyValue label="Razorpay order">
                      <span className="font-mono text-[12px]">{order.razorpayOrderId}</span>
                    </KeyValue>
                  )}
                </div>
              </DetailSection>
              <DetailSection title="Shipment" className="shadow-none">
                {order.trackingNumber ? (
                  <div className="flex flex-col gap-2 text-[13.5px]">
                    <KeyValue label="Courier">{order.trackingCarrier ?? "-"}</KeyValue>
                    <KeyValue label="Tracking no.">
                      <span className="font-mono">{order.trackingNumber}</span>
                    </KeyValue>
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noopener" className="caption-style flex items-center gap-1 text-primary hover:underline">
                        Open tracking page <ExternalLink className="size-3" aria-hidden />
                      </a>
                    )}
                    <Button variant="ghost" size="sm" className="self-start" onClick={() => setShipOpen(true)}>
                      Edit tracking
                    </Button>
                  </div>
                ) : (
                  <p className="caption-style text-subtle">Not shipped yet.</p>
                )}
              </DetailSection>
            </Panel>

            <Panel className="flex flex-col gap-3">
              <h2 className="text-[14px]">Change status</h2>
              <p className="caption-style leading-snug text-subtle">For corrections. The buttons above are the normal way through an order.</p>
              <Select value={statusPick} onValueChange={setStatusPick}>
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="caption-style flex items-center gap-2 text-soft">
                <Switch checked={notify} onCheckedChange={setNotify} /> Email the customer
              </label>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || statusPick === s}
                onClick={() => {
                  if (statusPick === "shipped" && !order.trackingNumber) return setShipOpen(true);
                  run(() => updateOrderStatus(order.id, statusPick, { notify }));
                }}
              >
                Update status
              </Button>
              <div className="flex items-center gap-2">
                <OrderStatusTag status={s} />
                {order.source === "wordpress" && <Tag tone="neutral">from old WordPress site</Tag>}
              </div>
            </Panel>
          </div>
        </div>
      </PageBody>

      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship order {order.number}</DialogTitle>
            <DialogDescription>The customer gets an email with these tracking details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-5">
            <Field label="Courier" htmlFor="carrier" required>
              <Input id="carrier" list="carriers" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. DTDC" />
              <datalist id="carriers">
                {CARRIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Tracking / AWB number" htmlFor="awb" required>
              <Input id="awb" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            </Field>
            <Field label="Tracking link" htmlFor="turl" hint="Optional. The courier's tracking page for this parcel.">
              <Input id="turl" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://" />
            </Field>
            <label className="caption-style flex items-center gap-2 text-soft">
              <Switch checked={notify} onCheckedChange={setNotify} /> Email the customer
            </label>
          </div>
          <DialogFooter>
            {s === "shipped" ? (
              <Button
                variant="primary"
                size="md"
                disabled={busy}
                onClick={async () => {
                  const r = await run(() => saveTracking(order.id, { trackingCarrier: carrier || null, trackingNumber: tracking || null, trackingUrl: trackingUrl || null }));
                  if (r.ok) setShipOpen(false);
                }}
              >
                Save tracking
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={busy || !carrier || !tracking}
                onClick={async () => {
                  const r = await run(() => updateOrderStatus(order.id, "shipped", { trackingCarrier: carrier, trackingNumber: tracking, trackingUrl: trackingUrl || null, notify }));
                  if (r.ok) setShipOpen(false);
                }}
              >
                <Truck className="size-3.5" aria-hidden /> Mark as shipped
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund {order.number}</DialogTitle>
            <DialogDescription>
              {order.paymentMethod === "razorpay"
                ? gatewayLive
                  ? "The money goes back to the customer's original payment method through Razorpay (5 to 7 working days)."
                  : "Test mode: the refund is recorded but no money moves."
                : "Cash on delivery: this records the refund. Pay the customer back by bank transfer or UPI yourself."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-5">
            <Field label="Amount" htmlFor="ramt" hint={`Up to ${rupees(order.total - order.refundedAmount)}`}>
              <RupeeInput id="ramt" valuePaise={refundAmount} onChange={setRefundAmount} />
            </Field>
            <Field label="Reason" htmlFor="rreason">
              <Input id="rreason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Damaged in transit, customer cancelled…" />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="danger"
              size="md"
              disabled={busy || refundAmount <= 0}
              onClick={async () => {
                if (!confirm(`Refund ${rupees(refundAmount)}? This can't be undone.`)) return;
                const r = await run(() => refundOrderAction(order.id, refundAmount, refundReason));
                if (r.ok) setRefundOpen(false);
              }}
            >
              Refund {rupees(refundAmount)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toastNode}
    </>
  );
}
