"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Tag, Truck, CreditCard, Banknote, Building2, ChevronDown, AlertTriangle, ShieldCheck, FlaskConical, X, Check } from "lucide-react";
import { cartStore, clearCart } from "@/lib/stores";
import { rupees } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/site";
import { useQuote } from "@/components/shop/useQuote";

type Addr = { name: string; phone: string; company: string; gstin: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
type Saved = Addr & { id: number };

const EMPTY: Addr = { name: "", phone: "", company: "", gstin: "", line1: "", line2: "", landmark: "", city: "", state: "Andhra Pradesh", pincode: "" };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function Step({ n, done }: { n: number; done: boolean }) {
  return done ? (
    <span key="done" className="grid size-7 place-items-center rounded-full bg-success text-white animate-pop" aria-label="Done">
      <Check className="size-4" strokeWidth={3} aria-hidden />
    </span>
  ) : (
    <span key="todo" className="grid size-7 place-items-center rounded-full bg-ink text-[13px] text-white">
      {n}
    </span>
  );
}

function AddressFields({ prefix, value, onChange }: { prefix: string; value: Addr; onChange: (a: Addr) => void }) {
  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${prefix}-name`}>
          Full name
        </label>
        <input id={`${prefix}-name`} required autoComplete="name" value={value.name} onChange={set("name")} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${prefix}-line1`}>
          Flat / house no., building, street
        </label>
        <input id={`${prefix}-line1`} required autoComplete="address-line1" value={value.line1} onChange={set("line1")} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-line2`}>
          Area, locality <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id={`${prefix}-line2`} autoComplete="address-line2" value={value.line2} onChange={set("line2")} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-landmark`}>
          Landmark <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id={`${prefix}-landmark`} value={value.landmark} onChange={set("landmark")} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-pincode`}>
          Pincode
        </label>
        <input
          id={`${prefix}-pincode`}
          required
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          pattern="\d{6}"
          value={value.pincode}
          onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-city`}>
          City / town
        </label>
        <input id={`${prefix}-city`} required autoComplete="address-level2" value={value.city} onChange={set("city")} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${prefix}-state`}>
          State
        </label>
        <select id={`${prefix}-state`} required autoComplete="address-level1" value={value.state} onChange={set("state")} className="field">
          {INDIAN_STATES.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function CheckoutForm({
  user,
  addresses,
  testMode,
  storeName,
}: {
  user: { name: string; email: string; phone: string } | null;
  addresses: Saved[];
  testMode: boolean;
  storeName: string;
}) {
  const router = useRouter();
  const items = cartStore.use();
  const [contact, setContact] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [savedId, setSavedId] = useState<number | null>(addresses[0]?.id ?? null);
  const [ship, setShip] = useState<Addr>(addresses[0] ?? { ...EMPTY, name: user?.name ?? "", phone: user?.phone ?? "" });
  const [gst, setGst] = useState(Boolean(addresses[0]?.gstin));
  const [company, setCompany] = useState(addresses[0]?.company ?? "");
  const [gstin, setGstin] = useState(addresses[0]?.gstin ?? "");
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBill] = useState<Addr>(EMPTY);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testPay, setTestPay] = useState<{ number: string; key: string; total: number } | null>(null);
  const [placed, setPlaced] = useState(false);

  const { quote, loading } = useQuote(items, coupon, method);
  const contactDone = contact.name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(contact.email) && /^(\+?91)?[6-9]\d{9}$/.test(contact.phone.replace(/[^\d+]/g, ""));
  const addressDone = ship.name.trim().length >= 2 && ship.line1.trim().length >= 3 && ship.city.trim().length >= 2 && /^\d{6}$/.test(ship.pincode) && (!gst || (company.trim().length > 1 && gstin.length === 15));

  useEffect(() => {
    if (quote && !quote.onlineAvailable && quote.codAvailable) setMethod("cod");
    if (quote && method === "cod" && !quote.codAvailable && quote.onlineAvailable) setMethod("razorpay");
  }, [quote, method]);

  useEffect(() => {
    if (!items.length && !busy && !placed) router.replace("/cart");
  }, [items.length, busy, placed, router]);

  function finish(number: string, key: string) {
    setPlaced(true);
    clearCart();
    router.push(`/order/${number}?key=${key}&placed=1`);
  }

  async function verify(payload: Record<string, string>) {
    const res = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return res.json() as Promise<{ ok?: boolean; error?: string }>;
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!quote?.ok) return setError("Please review your cart, some items need attention.");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          ...contact,
          shipping: { ...ship, phone: ship.phone || contact.phone, company: gst ? company : null },
          billing: gst && !billingSame ? { ...bill, company } : null,
          company: gst ? company : null,
          gstin: gst ? gstin : null,
          couponCode: coupon,
          paymentMethod: method,
          note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not place the order");

      if (data.paymentMethod === "cod") return finish(data.number, data.key);

      if (data.razorpay.test) {
        setTestPay({ number: data.number, key: data.key, total: data.total });
        setBusy(false);
        return;
      }

      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection and try again.");
      const rzp = new window.Razorpay({
        key: data.razorpay.keyId,
        order_id: data.razorpay.orderId,
        amount: data.total,
        currency: "INR",
        name: storeName,
        description: `Order ${data.number}`,
        image: "/brand/emblem.png",
        prefill: { name: data.customer.name, email: data.customer.email, contact: data.customer.phone },
        notes: { order: data.number },
        theme: { color: "#C9420C" },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setBusy(true);
          const v = await verify({ number: data.number, key: data.key, ...r });
          if (v.ok) finish(data.number, data.key);
          else {
            setBusy(false);
            setError(v.error ?? "We could not confirm the payment.");
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError(`Payment was not completed. Your order ${data.number} is saved, you can try paying again.`);
            router.push(`/order/${data.number}?key=${data.key}`);
          },
        },
      });
      rzp.on("payment.failed", (r) => {
        verify({ number: data.number, key: data.key, failure: r.error?.description ?? "declined" });
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (!items.length) return <div className="wrap py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="wrap py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-extrabold tracking-[-0.025em]">Checkout</h1>
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <Lock className="size-4" aria-hidden /> Secure checkout
        </p>
      </div>
      {!user && (
        <p className="mt-2 text-[14px] text-muted">
          Have an account?{" "}
          <Link href="/login?next=/checkout" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>{" "}
          for saved addresses. Or just continue as a guest.
        </p>
      )}

      <form onSubmit={placeOrder} className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-[17px] font-extrabold">
              <Step n={1} done={contactDone} />
              Contact details
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="c-name">
                  Your name
                </label>
                <input id="c-name" required autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="c-email">
                  Email
                </label>
                <input id="c-email" type="email" required autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="field" />
                <p className="mt-1 text-[12px] text-muted">Order updates and your invoice are sent here.</p>
              </div>
              <div>
                <label className="label" htmlFor="c-phone">
                  Mobile number
                </label>
                <input id="c-phone" type="tel" required autoComplete="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="field" placeholder="10 digit mobile" />
                <p className="mt-1 text-[12px] text-muted">For the delivery partner.</p>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-[17px] font-extrabold">
              <Step n={2} done={addressDone} />
              Delivery address
            </h2>
            {addresses.length > 0 && (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSavedId(a.id);
                        setShip(a);
                        if (a.gstin) {
                          setGst(true);
                          setGstin(a.gstin);
                          setCompany(a.company);
                        }
                      }}
                      className={`h-full w-full rounded-2xl p-4 text-left text-[13.5px] ring-1 transition ${savedId === a.id ? "bg-brand-50 ring-2 ring-brand-700" : "ring-line hover:ring-line-2"}`}
                    >
                      <span className="block font-bold text-ink">{a.name}</span>
                      <span className="mt-1 block text-muted">
                        {a.line1}, {a.line2 && `${a.line2}, `}
                        {a.city}, {a.state} {a.pincode}
                      </span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedId(null);
                      setShip({ ...EMPTY, name: contact.name });
                    }}
                    className={`grid h-full min-h-[84px] w-full place-items-center rounded-2xl border-2 border-dashed p-4 text-[14px] font-semibold ${savedId === null ? "border-brand-700 text-brand-700" : "border-line-2 text-muted hover:text-ink"}`}
                  >
                    + New address
                  </button>
                </li>
              </ul>
            )}
            {savedId === null && (
              <div className="mt-5">
                <AddressFields prefix="ship" value={ship} onChange={setShip} />
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-canvas p-4">
              <label className="flex cursor-pointer items-center gap-3 text-[14.5px] font-semibold">
                <input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} className="size-[18px] accent-brand-700" />
                <Building2 className="size-4 text-muted" aria-hidden />
                Buying for a business? Add GST details
              </label>
              {gst && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="g-company">
                      Company name
                    </label>
                    <input id="g-company" required value={company} onChange={(e) => setCompany(e.target.value)} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="g-gstin">
                      GSTIN
                    </label>
                    <input
                      id="g-gstin"
                      required
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))}
                      className="field font-mono tracking-wider"
                      placeholder="37ABCDE1234F1Z5"
                    />
                  </div>
                  <label className="flex items-center gap-2.5 text-[14px] sm:col-span-2">
                    <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="size-4 accent-brand-700" />
                    Billing address is the same as delivery
                  </label>
                  {!billingSame && (
                    <div className="sm:col-span-2">
                      <AddressFields prefix="bill" value={bill} onChange={setBill} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-semibold text-brand-700">
                Add delivery instructions <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className="field mt-3" placeholder="Office timings, floor, who to ask for…" />
            </details>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-[17px] font-extrabold">
              <Step n={3} done={contactDone && addressDone} />
              Payment
            </h2>
            <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Payment method">
              {quote?.onlineAvailable !== false && (
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition ${method === "razorpay" ? "bg-brand-50 ring-2 ring-brand-700" : "ring-line hover:ring-line-2"}`}>
                  <input type="radio" name="method" checked={method === "razorpay"} onChange={() => setMethod("razorpay")} className="mt-1 size-4 accent-brand-700" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-[15px] font-bold">
                      <CreditCard className="size-4" aria-hidden /> Pay online
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">UPI, debit and credit cards, net banking and wallets, secured by Razorpay</span>
                  </span>
                </label>
              )}
              <label
                className={`flex items-start gap-3 rounded-2xl p-4 ring-1 transition ${!quote?.codAvailable ? "cursor-not-allowed opacity-55 ring-line" : "cursor-pointer"} ${
                  method === "cod" ? "bg-brand-50 ring-2 ring-brand-700" : "ring-line hover:ring-line-2"
                }`}
              >
                <input type="radio" name="method" disabled={!quote?.codAvailable} checked={method === "cod"} onChange={() => setMethod("cod")} className="mt-1 size-4 accent-brand-700" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    <Banknote className="size-4" aria-hidden /> Cash on delivery
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {quote && !quote.codAvailable ? "Not available for this order" : quote?.codFee ? `${rupees(quote.codFee)} handling fee` : "Pay when your order arrives"}
                  </span>
                </span>
              </label>
            </div>
            {testMode && method === "razorpay" && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warn-50 p-3 text-[13px] text-warn">
                <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
                Test mode: Razorpay keys are not set yet, so you&apos;ll see a test payment step instead of the real payment window.
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-[150px] lg:self-start">
          <div className="card p-5">
            <h2 className="text-[17px] font-extrabold">Your order</h2>
            <ul className="mt-4 max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {(quote?.lines ?? []).map((l) => (
                <li key={l.productId} className="flex gap-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line">
                    {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />}
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">{l.qty}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13.5px] leading-snug font-semibold">{l.name}</span>
                    {l.problem && <span className="mt-0.5 block text-[12.5px] font-semibold text-danger">{l.problem}</span>}
                  </span>
                  <span className="text-[14px] font-bold tabular-nums">{rupees(l.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-line pt-4">
              {coupon && quote?.coupon?.applied ? (
                <div className="flex items-center justify-between rounded-xl bg-success-50 px-3 py-2.5 text-[13.5px] text-success">
                  <span className="flex items-center gap-2 font-semibold">
                    <Tag className="size-4" aria-hidden /> {coupon}
                  </span>
                  <button type="button" aria-label="Remove code" onClick={() => setCoupon(null)} className="rounded-full p-1 hover:bg-success/10">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <label htmlFor="coupon" className="sr-only">
                      Coupon code
                    </label>
                    <input
                      id="coupon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="field h-11 py-0 font-semibold uppercase"
                    />
                    <button type="button" onClick={() => couponInput.trim() && setCoupon(couponInput.trim())} className="btn-outline h-11 px-4 py-0">
                      Apply
                    </button>
                  </div>
                  {coupon && quote?.coupon && !quote.coupon.applied && <p className="mt-2 text-[13px] text-danger">{quote.coupon.message}</p>}
                </div>
              )}
            </div>

            <dl className={`mt-4 space-y-2.5 text-[14.5px] ${loading ? "opacity-60" : ""}`}>
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{rupees(quote?.subtotal ?? 0)}</dd>
              </div>
              {!!quote?.discount && (
                <div className="flex justify-between text-success">
                  <dt>Coupon</dt>
                  <dd className="tabular-nums">−{rupees(quote.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Truck className="size-4" aria-hidden /> Delivery
                </dt>
                <dd className="tabular-nums">{quote?.shippingFee ? rupees(quote.shippingFee) : <span className="font-semibold text-success">Free</span>}</dd>
              </div>
              {!!quote?.codFee && (
                <div className="flex justify-between">
                  <dt className="text-muted">Cash on delivery fee</dt>
                  <dd className="tabular-nums">{rupees(quote.codFee)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-[16px] font-extrabold">Total</dt>
                <dd className="text-[22px] font-extrabold tabular-nums">{rupees(quote?.total ?? 0)}</dd>
              </div>
              <p className="text-right text-[12px] text-muted">Inclusive of GST</p>
            </dl>

            {error && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-[13.5px] font-semibold text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <button disabled={busy || loading || !quote?.ok} className="btn-primary mt-4 h-13 w-full py-4 text-[16px]">
              {busy ? "Placing order…" : method === "cod" ? `Place order · ${rupees(quote?.total ?? 0)}` : `Pay ${rupees(quote?.total ?? 0)}`}
            </button>
            <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
              By placing this order you agree to our{" "}
              <Link href="/terms" className="underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/returns" className="underline">
                return policy
              </Link>
              .
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-muted">
              <ShieldCheck className="size-3.5 text-success" aria-hidden /> Payments are processed securely by Razorpay
            </p>
          </div>
        </aside>
      </form>

      {testPay && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-night/60 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Test payment">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-pop animate-rise">
            <p className="chip bg-warn-50 text-warn">
              <FlaskConical className="size-3.5" aria-hidden /> Test mode
            </p>
            <h2 className="mt-3 text-[20px] font-extrabold">Pay {rupees(testPay.total)}</h2>
            <p className="mt-1 text-[14px] text-muted">Order {testPay.number}. No real money moves. This step is replaced by Razorpay once keys are added.</p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={busy}
                className="btn-primary"
                onClick={async () => {
                  setBusy(true);
                  const v = await verify({ number: testPay.number, key: testPay.key, test: "success" });
                  if (v.ok) finish(testPay.number, testPay.key);
                  else {
                    setBusy(false);
                    setError(v.error ?? "Test payment failed");
                    setTestPay(null);
                  }
                }}
              >
                Simulate successful payment
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn-outline"
                onClick={async () => {
                  await verify({ number: testPay.number, key: testPay.key, test: "failure" });
                  setTestPay(null);
                  router.push(`/order/${testPay.number}?key=${testPay.key}`);
                }}
              >
                Simulate failed payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
