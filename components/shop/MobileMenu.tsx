"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, Phone, Package, Heart, MapPin, Flame, UserRound, LayoutDashboard, Store } from "lucide-react";
import type { NavCategory } from "@/components/shop/CategoryBar";
import Logo from "@/components/shop/Logo";
import { OPEN_MENU_EVENT } from "@/components/shop/MobileTabBar";

export default function MobileMenu({ nav, phone, account }: { nav: NavCategory[]; phone: string; account: { name: string; admin: boolean } | null }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, open);
    return () => window.removeEventListener(OPEN_MENU_EVENT, open);
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-canvas lg:hidden">
        <Menu className="size-6" aria-hidden />
      </button>
      {open &&
        createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-night/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop animate-slide-in-left">
            <div className="flex items-center justify-between border-b border-line p-4">
              <Logo size={34} />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-canvas">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <Link href={account ? "/account" : "/login"} className="m-4 flex items-center gap-3 rounded-2xl bg-canvas p-3.5">
                <span className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-line">
                  <UserRound className="size-5" aria-hidden />
                </span>
                <span className="text-[15px] font-bold">{account ? `Hello, ${account.name.split(" ")[0]}` : "Sign in or create account"}</span>
              </Link>
              <p className="px-5 pt-1 pb-2 text-[12px] font-bold tracking-[0.12em] text-muted uppercase">Shop by category</p>
              <ul className="px-2">
                {nav.map((c) => (
                  <li key={c.slug}>
                    <div className="flex items-center">
                      <Link href={`/category/${c.slug}`} className="flex-1 rounded-xl px-3 py-3 text-[15px] font-semibold text-ink">
                        {c.name}
                      </Link>
                      {c.children.length > 0 && (
                        <button
                          type="button"
                          aria-label={`Show ${c.name} sub-categories`}
                          aria-expanded={expanded === c.slug}
                          onClick={() => setExpanded(expanded === c.slug ? null : c.slug)}
                          className="grid size-11 place-items-center rounded-xl text-muted hover:bg-canvas"
                        >
                          <ChevronRight className={`size-5 transition-transform ${expanded === c.slug ? "rotate-90" : ""}`} aria-hidden />
                        </button>
                      )}
                    </div>
                    {expanded === c.slug && (
                      <ul className="mb-2 ml-3 border-l-2 border-brand-100 pl-2">
                        {c.children.map((k) => (
                          <li key={k.slug}>
                            <Link href={`/category/${k.slug}`} className="block rounded-lg px-3 py-2.5 text-[14.5px] text-body">
                              {k.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mx-4 my-3 border-t border-line" />
              <ul className="px-2 pb-6 text-[15px]">
                {[
                  { href: "/deals", label: "Deals", icon: Flame },
                  { href: "/track", label: "Track your order", icon: Package },
                  { href: "/wishlist", label: "Wishlist", icon: Heart },
                  { href: "/sell", label: "Sell on Gnananetra", icon: Store },
                  { href: "/store-location", label: "Store location", icon: MapPin },
                  ...(account?.admin ? [{ href: "/admin", label: "Admin console", icon: LayoutDashboard }] : []),
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium text-ink">
                      <l.icon className="size-5 text-muted" aria-hidden />
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium text-ink">
                    <Phone className="size-5 text-muted" aria-hidden />
                    {phone}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
