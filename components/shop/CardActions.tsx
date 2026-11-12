"use client";

import { useState } from "react";
import { Heart, ShoppingBag, BellRing, Check } from "lucide-react";
import Link from "next/link";
import { addToCart, cartStore, setCartOpen, toggleSaved, wishlistStore, type SavedItem } from "@/lib/stores";
import { toast } from "@/components/shop/Toaster";

export function CardWishlist({ item }: { item: SavedItem }) {
  const list = wishlistStore.use();
  const saved = list.some((i) => i.productId === item.productId);
  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      aria-pressed={saved}
      onClick={() => {
        const added = toggleSaved(wishlistStore, item);
        toast(added ? "Saved to your wishlist" : "Removed from wishlist");
      }}
      className={`absolute top-2.5 right-2.5 z-10 grid size-10 place-items-center rounded-full bg-white/95 shadow-card ring-1 ring-line transition-[opacity,transform] hover:scale-105 ${
        saved ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
      }`}
    >
      <Heart key={String(saved)} className={`size-[17px] transition-colors ${saved ? "fill-brand-700 text-brand-700 animate-pop" : "text-ink-2"}`} aria-hidden />
    </button>
  );
}

export function CardAddButton({ item, available }: { item: SavedItem; available: boolean }) {
  const cart = cartStore.use();
  const inCart = cart.some((i) => i.productId === item.productId);
  const [justAdded, setJustAdded] = useState(false);
  if (!available) {
    return (
      <Link href={`/product/${item.slug}#notify`} className="btn-outline btn-sm w-full">
        <BellRing className="size-4" aria-hidden />
        Notify me
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (inCart) return setCartOpen(true);
        addToCart(item, 1);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1400);
        setTimeout(() => setCartOpen(true), 380);
      }}
      className={`btn btn-sm w-full transition-[background-color,color,box-shadow] duration-300 ${justAdded ? "bg-success text-white" : inCart ? "btn-outline" : "btn-dark"}`}
    >
      {justAdded ? (
        <span key="added" className="flex items-center gap-2 animate-tick">
          <Check className="size-4 animate-pop" aria-hidden /> Added
        </span>
      ) : inCart ? (
        <>
          <Check className="size-4 text-success" aria-hidden /> In cart
        </>
      ) : (
        <>
          <ShoppingBag className="size-4" aria-hidden /> Add to cart
        </>
      )}
    </button>
  );
}
