"use client";

import Link from "next/link";
import { Heart, ShoppingBag, UserRound, LayoutDashboard } from "lucide-react";
import { cartStore, setCartOpen, wishlistStore } from "@/lib/stores";
import { rupees } from "@/lib/money";

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span key={n} className="absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full bg-brand-700 px-1 text-[12px] leading-[18px] font-bold text-white ring-2 ring-surface animate-bump">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function HeaderActions({ account }: { account: { name: string; admin: boolean } | null }) {
  const cart = cartStore.use();
  const wish = wishlistStore.use();
  const count = cart.reduce((n, i) => n + i.qty, 0);
  const total = cart.reduce((n, i) => n + i.qty * i.price, 0);

  return (
    <div className="ml-auto flex items-center gap-1 sm:gap-2">
      {account?.admin && (
        <Link href="/admin" className="hidden items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-2 ring-1 ring-line hover:bg-canvas xl:flex">
          <LayoutDashboard className="size-4" aria-hidden />
          Admin
        </Link>
      )}
      <Link
        href={account ? "/account" : "/login"}
        className="hidden items-center gap-2.5 rounded-full py-1.5 pr-3 pl-1.5 hover:bg-canvas sm:flex"
      >
        <span className="grid size-9 place-items-center rounded-full bg-canvas ring-1 ring-line">
          <UserRound className="size-[18px] text-ink-2" aria-hidden />
        </span>
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="text-[12px] text-muted">{account ? "Hello," : "Welcome"}</span>
          <span className="max-w-[110px] truncate text-[13.5px] font-bold text-ink">{account ? account.name.split(" ")[0] : "Sign in"}</span>
        </span>
      </Link>
      <Link href="/wishlist" aria-label={`Wishlist, ${wish.length} items`} className="relative grid size-11 place-items-center rounded-full hover:bg-canvas">
        <Heart className="size-[22px] text-ink-2" aria-hidden />
        <Count n={wish.length} />
      </Link>
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        aria-label={`Cart, ${count} items`}
        className="flex items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-1.5 hover:bg-canvas lg:pr-3"
      >
        <span className="relative grid size-9 place-items-center rounded-full bg-ink text-white">
          <ShoppingBag className="size-[18px]" aria-hidden />
          <Count n={count} />
        </span>
        <span className="hidden flex-col items-start leading-tight lg:flex">
          <span className="text-[12px] text-muted">Your cart</span>
          <span className="text-[13.5px] font-bold text-ink tabular-nums">{rupees(total)}</span>
        </span>
      </button>
    </div>
  );
}
