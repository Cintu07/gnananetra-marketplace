"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ReceiptIndianRupee, Store, Truck } from "lucide-react";

const ITEMS = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: Truck },
  { href: "/seller/earnings", label: "Earnings", icon: ReceiptIndianRupee },
  { href: "/seller/store", label: "My store", icon: Store },
];

export default function SellerNav({ toShip }: { toShip: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Seller centre" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {ITEMS.map((i) => {
        const on = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "bg-ink text-white" : "text-ink-2 hover:bg-canvas"}`}
          >
            <i.icon className="size-4" aria-hidden />
            {i.label}
            {i.href === "/seller/orders" && toShip > 0 && <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[12px] leading-none font-bold ${on ? "bg-white text-ink" : "bg-brand-700 text-white"}`}>{toShip}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
