"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { addToCart, setCartOpen, toggleSaved, wishlistStore } from "@/lib/stores";
import { discountPercent, rupees } from "@/lib/money";

export default function SavedList() {
  const items = wishlistStore.use();
  return (
    <div className="wrap py-8">
      <h1 className="text-[28px] font-extrabold tracking-[-0.025em]">Wishlist</h1>
      <p className="mt-1 text-[14px] text-muted">Saved on this device. Prices shown are from when you saved them; the latest price shows on the product page.</p>
      {items.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Heart className="size-10 text-faint" aria-hidden />
          <p className="text-[17px] font-bold">Nothing saved yet</p>
          <p className="text-[14px] text-muted">Tap the heart on any product to keep it here.</p>
          <Link href="/shop" className="btn-primary mt-2">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((i) => {
            const off = discountPercent(i.price, i.mrp);
            return (
              <li key={i.productId} className="card flex flex-col overflow-hidden">
                <Link href={`/product/${i.slug}`} className="relative aspect-square bg-white">
                  {i.image && <Image src={i.image} alt="" fill sizes="240px" className="object-contain p-5" />}
                </Link>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-2">
                  <Link href={`/product/${i.slug}`} className="line-clamp-2 text-[14px] leading-snug font-semibold hover:text-brand-700">
                    {i.name}
                  </Link>
                  <p className="mt-auto flex items-baseline gap-2">
                    <span className="text-[17px] font-extrabold">{rupees(i.price)}</span>
                    {off > 0 && <span className="text-[12.5px] font-bold text-success">{off}% off</span>}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(i, 1);
                        setCartOpen(true);
                      }}
                      className="btn-dark btn-sm flex-1"
                    >
                      <ShoppingBag className="size-4" aria-hidden /> Add
                    </button>
                    <button type="button" aria-label={`Remove ${i.name}`} onClick={() => toggleSaved(wishlistStore, i)} className="btn-outline btn-sm px-2.5">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
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
