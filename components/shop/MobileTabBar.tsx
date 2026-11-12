"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Flame, ShoppingBag, UserRound } from "lucide-react";
import { cartStore, setCartOpen } from "@/lib/stores";

export const OPEN_MENU_EVENT = "gn:open-menu";

// App-style bottom bar on phones: the one-thumb way around the shop. Hidden where the
// page has its own bottom action (product buy bar, checkout).
export default function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const cart = cartStore.use();
  const count = cart.reduce((n, i) => n + i.qty, 0);
  if (pathname.startsWith("/product/") || pathname.startsWith("/checkout")) return null;

  const item = "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors active:scale-95";
  const tone = (active: boolean) => (active ? "text-brand-700" : "text-muted");
  const dot = (active: boolean) =>
    active && <span aria-hidden className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-brand-700 animate-fade-in" />;

  const isHome = pathname === "/";
  const isDeals = pathname.startsWith("/deals");
  const isAccount = pathname.startsWith("/account") || pathname.startsWith("/login");
  const isShop = pathname.startsWith("/shop") || pathname.startsWith("/category") || pathname.startsWith("/brand");

  return (
    <>
      <div aria-hidden className="h-[calc(60px+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="Shortcuts"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(60px+env(safe-area-inset-bottom))] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgb(16_24_40/0.25)] backdrop-blur-md lg:hidden"
      >
        <Link href="/" className={`${item} ${tone(isHome)}`} aria-current={isHome ? "page" : undefined}>
          {dot(isHome)}
          <Home className="size-[22px]" aria-hidden />
          Home
        </Link>
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))} className={`${item} ${tone(isShop)}`}>
          {dot(isShop)}
          <LayoutGrid className="size-[22px]" aria-hidden />
          Categories
        </button>
        <Link href="/deals" className={`${item} ${tone(isDeals)}`} aria-current={isDeals ? "page" : undefined}>
          {dot(isDeals)}
          <Flame className="size-[22px]" aria-hidden />
          Deals
        </Link>
        <button type="button" onClick={() => setCartOpen(true)} className={`${item} text-muted`} aria-label={`Cart, ${count} items`}>
          <span className="relative">
            <ShoppingBag className="size-[22px]" aria-hidden />
            {count > 0 && (
              <span key={count} className="absolute -top-1.5 -right-2.5 grid min-w-[18px] place-items-center rounded-full bg-brand-700 px-1 text-[12px] leading-[18px] font-bold text-white ring-2 ring-surface animate-bump">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
          Cart
        </button>
        <Link href={signedIn ? "/account" : "/login"} className={`${item} ${tone(isAccount)}`} aria-current={isAccount ? "page" : undefined}>
          {dot(isAccount)}
          <UserRound className="size-[22px]" aria-hidden />
          {signedIn ? "Account" : "Sign in"}
        </Link>
      </nav>
    </>
  );
}
