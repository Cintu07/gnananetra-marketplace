"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Zap, Heart, GitCompareArrows, Share2, BellRing, Check } from "lucide-react";
import { addToCart, cartStore, compareStore, pushRecent, setCartOpen, toggleSaved, wishlistStore, type SavedItem } from "@/lib/stores";
import { requestStockAlert } from "@/app/(shop)/actions";
import { toast } from "@/components/shop/Toaster";
import { rupees } from "@/lib/money";

export default function BuyBox({ item, available, maxQty }: { item: SavedItem; available: boolean; maxQty: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const wish = wishlistStore.use();
  const compare = compareStore.use();
  const cart = cartStore.use();
  const saved = wish.some((i) => i.productId === item.productId);
  const comparing = compare.some((i) => i.productId === item.productId);
  const inCart = cart.find((i) => i.productId === item.productId);

  useEffect(() => pushRecent(item.slug), [item.slug]);

  // the sticky phone bar appears only once the main buttons have scrolled away
  const mainButtons = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = mainButtons.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const add = (open = true) => {
    addToCart(item, qty);
    if (open) setCartOpen(true);
  };

  return (
    <div>
      {available ? (
        <>
          <div ref={mainButtons} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full bg-surface ring-1 ring-line-2" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center rounded-full hover:bg-canvas">
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="w-8 overflow-hidden text-center text-[16px] font-bold tabular-nums" aria-live="polite">
                <span key={qty} className="inline-block animate-tick">
                  {qty}
                </span>
              </span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="grid size-12 place-items-center rounded-full hover:bg-canvas">
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
            <button type="button" onClick={() => add()} className="btn-dark h-12 flex-1 basis-40">
              <ShoppingBag className="size-[18px]" aria-hidden />
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => {
                add(false);
                router.push("/checkout");
              }}
              className="btn-primary h-12 flex-1 basis-40"
            >
              <Zap className="size-[18px]" aria-hidden />
              Buy now
            </button>
          </div>
          {inCart && (
            <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-success">
              <Check className="size-4" aria-hidden /> {inCart.qty} in your cart ·{" "}
              <button type="button" onClick={() => setCartOpen(true)} className="inline-flex min-h-10 items-center font-semibold underline underline-offset-2">
                view cart
              </button>
            </p>
          )}
        </>
      ) : (
        <NotifyMe productId={item.productId} />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => toast(toggleSaved(wishlistStore, item) ? "Saved to your wishlist" : "Removed from wishlist")}
          className="btn-ghost btn-sm ring-1 ring-line"
        >
          <Heart key={String(saved)} className={`size-4 ${saved ? "fill-brand-700 text-brand-700 animate-pop" : ""}`} aria-hidden />
          {saved ? "Saved" : "Wishlist"}
        </button>
        <button
          type="button"
          aria-pressed={comparing}
          onClick={() => {
            if (!comparing && compare.length >= 4) return toast("You can compare up to 4 products", true);
            toast(toggleSaved(compareStore, item, 4) ? "Added to compare" : "Removed from compare");
          }}
          className="btn-ghost btn-sm ring-1 ring-line"
        >
          <GitCompareArrows className={`size-4 ${comparing ? "text-brand-700" : ""}`} aria-hidden />
          {comparing ? "Comparing" : "Compare"}
        </button>
        {compare.length > 1 && (
          <a href="/compare" className="btn-ghost btn-sm text-brand-700">
            View comparison ({compare.length})
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            const url = window.location.href;
            try {
              if (navigator.share) await navigator.share({ title: item.name, url });
              else {
                await navigator.clipboard.writeText(url);
                toast("Link copied");
              }
            } catch {}
          }}
          className="btn-ghost btn-sm ring-1 ring-line"
        >
          <Share2 className="size-4" aria-hidden />
          Share
        </button>
      </div>

      {available && showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(16_24_40/0.25)] animate-rise lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-muted">{item.name}</p>
            <p className="text-[17px] font-extrabold tabular-nums">{rupees(item.price)}</p>
          </div>
          <button type="button" onClick={() => add()} className="btn-primary h-11 px-5">
            <ShoppingBag className="size-4" aria-hidden />
            Add to cart
          </button>
        </div>
      )}
    </div>
  );
}

function NotifyMe({ productId }: { productId: number }) {
  const [state, action, pending] = useActionState(requestStockAlert, null);
  return (
    <div id="notify" className="rounded-2xl bg-warn-50 p-4 ring-1 ring-[#f5d9a8]">
      <p className="flex items-center gap-2 text-[15px] font-bold text-warn">
        <BellRing className="size-4" aria-hidden /> Currently out of stock
      </p>
      {state?.ok ? (
        <p className="mt-2 text-[14px] font-semibold text-success">{state.message}</p>
      ) : (
        <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="productId" value={productId} />
          <label htmlFor="notify-email" className="sr-only">
            Email address
          </label>
          <input id="notify-email" name="email" type="email" required placeholder="Your email address" className="field h-12 py-0 sm:flex-1" />
          <button disabled={pending} className="btn-dark h-12">
            {pending ? "Saving…" : "Notify me"}
          </button>
        </form>
      )}
      {state?.error && <p className="mt-2 text-[13px] text-danger">{state.error}</p>}
      <p className="mt-2 text-[12.5px] text-muted">We&apos;ll email you once when it&apos;s back. You can also call us to check incoming stock.</p>
    </div>
  );
}
