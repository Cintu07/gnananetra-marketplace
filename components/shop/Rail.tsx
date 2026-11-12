import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Card } from "@/lib/catalog";
import ProductCard from "@/components/shop/ProductCard";
import ScrollRow from "@/components/shop/ScrollRow";

// A titled row of products: swipeable on phones, a grid on desktop.
export default function Rail({
  title,
  eyebrow,
  href,
  items,
  action,
  showDeal,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  items: Card[];
  action?: React.ReactNode;
  showDeal?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section className="reveal wrap mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {action}
          {href && (
            <Link href={href} className="group -my-2 flex items-center gap-1.5 py-2.5 text-[14px] font-bold text-brand-700 hover:text-brand-800">
              View all
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
      <ScrollRow
        label={title}
        arrowsClass="sm:hidden"
        listClass="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-5"
      >
        {items.map((p) => (
          <li key={p.id} className="w-[46vw] max-w-[230px] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <ProductCard p={p} showDeal={showDeal} />
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}
