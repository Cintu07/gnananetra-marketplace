import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Package, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ordersForUser } from "@/lib/orders";
import { rupees } from "@/lib/money";
import { ORDER_STATUS_LABEL, formatDate } from "@/lib/site";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function AccountOrders() {
  const user = await requireUser("/account");
  const orders = await ordersForUser(user.id);
  if (!orders.length)
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Package className="size-10 text-faint" aria-hidden />
        <p className="text-[17px] font-bold">No orders yet</p>
        <p className="text-[14px] text-muted">When you place an order it will show up here.</p>
        <Link href="/shop" className="btn-primary mt-2">
          Start shopping
        </Link>
      </div>
    );
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/order/${o.number}`} className="card group flex flex-wrap items-center gap-4 p-4 hover:ring-line-2 sm:flex-nowrap">
            <div className="flex -space-x-3">
              {o.items.slice(0, 3).map((i, idx) => (
                <span key={idx} className="relative size-14 overflow-hidden rounded-xl bg-white ring-2 ring-surface">
                  {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain p-1 ring-1 ring-line" />}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">
                {o.number} <span className="ml-2 chip bg-canvas text-ink-2">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
              </p>
              <p className="mt-1 line-clamp-1 text-[13.5px] text-muted">
                {formatDate(o.createdAt)} · {o.items.map((i) => i.name).join(", ")}
              </p>
            </div>
            <p className="text-[16px] font-extrabold tabular-nums">{rupees(o.total)}</p>
            <ChevronRight className="size-5 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
