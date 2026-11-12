"use client";

import Link from "next/link";
import { Bell, BellRing, ChevronRight, MessageSquare, Package, ShoppingBag, Star, type LucideIcon, Store } from "lucide-react";
import Button from "@/components/admin/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import { useAdmin } from "@/components/admin/admin-context";

type Item = { key: string; icon: LucideIcon; title: string; detail: string; href: string };

// The bell lists what needs a human right now, driven by the same counts as the
// sidebar badges. Empty means you are caught up.
export default function Notifications() {
  const { base, counts } = useAdmin();

  const items: Item[] = [];
  if (counts?.orders_to_ship)
    items.push({
      key: "ship",
      icon: ShoppingBag,
      title: `${counts.orders_to_ship} order${counts.orders_to_ship === 1 ? "" : "s"} to ship`,
      detail: "Confirmed and waiting to be packed or dispatched",
      href: `${base}/orders?view=to-ship`,
    });
  if (counts?.sellers_pending)
    items.push({
      key: "sellers",
      icon: Store,
      title: `${counts.sellers_pending} seller${counts.sellers_pending === 1 ? "" : "s"} waiting for approval`,
      detail: "Their products stay hidden until you approve",
      href: `${base}/sellers`,
    });
  if (counts?.inquiries_new)
    items.push({
      key: "inq",
      icon: MessageSquare,
      title: `${counts.inquiries_new} new inquir${counts.inquiries_new === 1 ? "y" : "ies"}`,
      detail: "Customers and bulk buyers waiting for a reply",
      href: `${base}/inquiries`,
    });
  if (counts?.reviews_pending)
    items.push({
      key: "rev",
      icon: Star,
      title: `${counts.reviews_pending} review${counts.reviews_pending === 1 ? "" : "s"} to check`,
      detail: "Hidden until you approve them",
      href: `${base}/reviews`,
    });
  if (counts?.stock_alerts)
    items.push({
      key: "alerts",
      icon: BellRing,
      title: `${counts.stock_alerts} back-in-stock request${counts.stock_alerts === 1 ? "" : "s"}`,
      detail: "Shoppers waiting for out-of-stock products",
      href: `${base}/stock-alerts`,
    });
  if (counts?.low_stock)
    items.push({
      key: "stock",
      icon: Package,
      title: `${counts.low_stock} product${counts.low_stock === 1 ? "" : "s"} low on stock`,
      detail: "At or below their low-stock level",
      href: `${base}/inventory`,
    });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={`Notifications${items.length ? `, ${items.length} items` : ""}`} className="relative">
          <Bell aria-hidden className="size-3.5" />
          {items.length > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-status ring-2 ring-secondary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] max-w-[calc(100vw-2rem)]">
        <div className="flex h-12 items-center border-b border-line-strong px-4">
          <h4 className="text-[14px] font-medium">Needs attention</h4>
        </div>
        {items.length === 0 ? (
          <p className="caption-style px-4 py-10 text-center text-subtle">You&apos;re all caught up.</p>
        ) : (
          <ul className="p-1.5">
            {items.map(({ key, icon: Icon, title, detail, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 outline-none transition-colors duration-150 ease-power3-out hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-icon">
                    <Icon aria-hidden className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate text-[14px] leading-none">{title}</span>
                    <span className="caption-style truncate text-subtle">{detail}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-3.5 shrink-0 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
