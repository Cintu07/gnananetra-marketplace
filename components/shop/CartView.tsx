"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ShieldCheck, Truck, AlertTriangle } from "lucide-react";
import { cartStore, setCartQty } from "@/lib/stores";
import { rupees } from "@/lib/money";
import { useQuote } from "@/components/shop/useQuote";

export default function CartView() {
  const items = cartStore.use();
  const { quote, loading } = useQuote(items, null);

  // keep the stored snapshot's prices in line with the server
  useEffect(() => {
    if (!quote) return;
    cartStore.update((list) =>
      list.map((i) => {
        const l = quote.lines.find((x) => x.productId === i.productId);
        return l && (l.unitPrice !== i.price || l.mrp !== i.mrp) ? { ...i, price: l.unitPrice, mrp: l.mrp } : i;
      }),
    );
  }, [quote]);

  if (!items.length) {
    return (
      <div className="wrap py-16">
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-brand-50">
            <ShoppingBag className="size-7 text-brand-700" aria-hidden />
          </span>
          <h1 className="text-[22px] font-extrabold">Your cart is empty</h1>
          <p className="text-[14.5px] text-muted">Find printers, laptops, desktops, UPS and more.</p>
          <Link href="/shop" className="btn-primary mt-2">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  const lineFor = (id: number) => quote?.lines.find((l) => l.productId === id);

  return (
    <div className="wrap py-8">
      <h1 className="text-[28px] font-extrabold tracking-[-0.025em]">Your cart</h1>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ul className="card divide-y divide-line">
          {items.map((i) => {
            const line = lineFor(i.productId);
            return (
              <li key={i.productId} className="flex gap-4 p-4 sm:p-5">
                <Link href={`/product/${i.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line sm:size-28">
                  {i.image && <Image src={i.image} alt="" fill sizes="112px" className="object-contain p-2" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/product/${i.slug}`} className="line-clamp-2 text-[15px] leading-snug font-semibold hover:text-brand-700">
                      {i.name}
                    </Link>
                    <p className="shrink-0 text-[16px] font-extrabold tabular-nums">{rupees((line?.unitPrice ?? i.price) * i.qty)}</p>
                  </div>
                  <p className="mt-1 text-[13.5px] text-muted">
                    {rupees(line?.unitPrice ?? i.price)} each
                    {(line?.mrp ?? i.mrp) && (line?.mrp ?? i.mrp)! > (line?.unitPrice ?? i.price) && <s className="ml-2 text-faint">{rupees(line?.mrp ?? i.mrp)}</s>}
                  </p>
                  {line?.problem && (
                    <p className="mt-2 flex items-center gap-1.5 text-[13.5px] font-semibold text-danger">
                      <AlertTriangle className="size-4" aria-hidden />
                      {line.problem}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full ring-1 ring-line-2">
                      <button type="button" aria-label="Decrease quantity" onClick={() => setCartQty(i.productId, i.qty - 1)} className="grid size-9 place-items-center rounded-full hover:bg-canvas">
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="w-8 text-center text-[14px] font-bold tabular-nums">{i.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={line ? i.qty >= line.maxQty : false}
                        onClick={() => setCartQty(i.productId, i.qty + 1)}
                        className="grid size-9 place-items-center rounded-full hover:bg-canvas disabled:opacity-40"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <button type="button" onClick={() => setCartQty(i.productId, 0)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-muted hover:bg-danger-50 hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-[150px] lg:self-start">
          <div className="card p-5">
            <h2 className="text-[17px] font-extrabold">Order summary</h2>
            <dl className={`mt-4 space-y-2.5 text-[14.5px] ${loading ? "opacity-60" : ""}`}>
              <div className="flex justify-between">
                <dt className="text-muted">Items ({quote?.itemCount ?? items.reduce((n, i) => n + i.qty, 0)})</dt>
                <dd className="tabular-nums">{rupees(quote?.mrpTotal ?? 0)}</dd>
              </div>
              {quote && quote.mrpTotal > quote.subtotal && (
                <div className="flex justify-between text-success">
                  <dt>Product discount</dt>
                  <dd className="tabular-nums">−{rupees(quote.mrpTotal - quote.subtotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">{quote?.shippingFee ? rupees(quote.shippingFee) : <span className="font-semibold text-success">Free</span>}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-[17px] font-extrabold">
                <dt>Total</dt>
                <dd className="tabular-nums">{rupees(quote?.total ?? 0)}</dd>
              </div>
            </dl>
            {quote && quote.freeShippingGap > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-[13px] text-brand-800">
                <Truck className="size-4 shrink-0" aria-hidden /> Add {rupees(quote.freeShippingGap)} more for free delivery
              </p>
            )}
            <p className="mt-3 text-[12.5px] text-muted">Have a coupon? Apply it at checkout.</p>
            {quote && !quote.ok ? (
              <p className="mt-4 rounded-xl bg-danger-50 p-3 text-[13.5px] font-semibold text-danger">Please fix the items marked above to continue.</p>
            ) : (
              <Link href="/checkout" aria-disabled={!quote} className="btn-primary mt-4 h-12 w-full">
                Proceed to checkout
              </Link>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted">
              <ShieldCheck className="size-3.5 text-success" aria-hidden /> Secure checkout · GST invoice
            </p>
          </div>
          <Link href="/shop" className="mt-1 flex min-h-11 items-center justify-center text-center text-[14px] font-semibold text-brand-700 hover:underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
