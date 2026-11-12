"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, ShoppingBag, Minus, Plus, Trash2, ShieldCheck } from "lucide-react";
import { cartStore, setCartOpen, setCartQty, useCartOpen } from "@/lib/stores";
import { rupees } from "@/lib/money";

export default function CartDrawer() {
  const open = useCartOpen();
  const items = cartStore.use();
  const pathname = usePathname();
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const savings = items.reduce((n, i) => n + Math.max(0, (i.mrp ?? i.price) - i.price) * i.qty, 0);

  useEffect(() => setCartOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="absolute inset-0 bg-night/50 animate-fade-in" onClick={() => setCartOpen(false)} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[18px] font-extrabold">
            Your cart <span className="text-muted">({items.reduce((n, i) => n + i.qty, 0)})</span>
          </h2>
          <button type="button" aria-label="Close cart" onClick={() => setCartOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-canvas">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand-50">
              <ShoppingBag className="size-7 text-brand-700" aria-hidden />
            </span>
            <p className="text-[17px] font-bold">Your cart is empty</p>
            <p className="max-w-[260px] text-[14px] text-muted">Printers, laptops, desktops and more are waiting for you.</p>
            <Link href="/shop" className="btn-primary mt-2">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5">
              {items.map((i, idx) => (
                <li key={i.productId} className="flex gap-4 py-4 animate-rise" style={{ animationDelay: `${Math.min(idx, 6) * 45}ms`, animationFillMode: "both" }}>
                  <Link href={`/product/${i.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line">
                    {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain p-1.5" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/product/${i.slug}`} className="line-clamp-2 text-[14px] leading-snug font-semibold hover:text-brand-700">
                      {i.name}
                    </Link>
                    <p className="mt-1 text-[14px]">
                      <span className="font-bold">{rupees(i.price)}</span>
                      {i.mrp && i.mrp > i.price && <s className="ml-2 text-[12.5px] text-faint">{rupees(i.mrp)}</s>}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full ring-1 ring-line-2">
                        <button type="button" aria-label="Decrease quantity" onClick={() => setCartQty(i.productId, i.qty - 1)} className="grid size-10 place-items-center rounded-full hover:bg-canvas sm:size-8">
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="w-7 overflow-hidden text-center text-[14px] font-bold tabular-nums">
                          <span key={i.qty} className="inline-block animate-tick">
                            {i.qty}
                          </span>
                        </span>
                        <button type="button" aria-label="Increase quantity" onClick={() => setCartQty(i.productId, i.qty + 1)} className="grid size-10 place-items-center rounded-full hover:bg-canvas sm:size-8">
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <button type="button" aria-label={`Remove ${i.name}`} onClick={() => setCartQty(i.productId, 0)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-danger-50 hover:text-danger sm:size-8">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-canvas/60 p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">Subtotal</span>
                <span className="text-[20px] font-extrabold tabular-nums">{rupees(subtotal)}</span>
              </div>
              {savings > 0 && <p className="mt-1 text-right text-[13px] font-semibold text-success">You save {rupees(savings)}</p>}
              <p className="mt-1 text-[12.5px] text-muted">Delivery and any offers are worked out at checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/cart" className="btn-outline">
                  View cart
                </Link>
                <Link href="/checkout" className="btn-primary">
                  Checkout
                </Link>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted">
                <ShieldCheck className="size-3.5 text-success" aria-hidden />
                Secure payments by Razorpay
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
