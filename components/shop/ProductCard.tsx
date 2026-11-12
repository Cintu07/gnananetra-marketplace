import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { discountOf, inStock } from "@/lib/catalog";
import { rupees } from "@/lib/money";
import { CardWishlist, CardAddButton } from "@/components/shop/CardActions";

export default function ProductCard({ p, priority = false, showDeal = false }: { p: Card; priority?: boolean; showDeal?: boolean }) {
  const off = discountOf(p);
  const available = inStock(p);
  const snapshot = { productId: p.id, slug: p.slug, name: p.name, image: p.image, price: p.price, mrp: p.mrp };
  const dealPct = p.dealQuantity ? Math.min(100, Math.round((p.dealSold / p.dealQuantity) * 100)) : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface text-ink ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-lift hover:ring-line-2">
      <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-white" tabIndex={-1} aria-hidden>
        {p.image ? (
          <>
            <Image
              src={p.image}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 50vw"
              className={`object-contain p-5 transition duration-500 ease-out-expo group-hover:scale-[1.04] ${p.image2 ? "group-hover:opacity-0" : ""} ${available ? "" : "opacity-60 grayscale-[35%]"}`}
            />
            {p.image2 && (
              <Image src={p.image2} alt="" fill sizes="(min-width: 1280px) 260px, 50vw" className="object-contain p-5 opacity-0 transition duration-500 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[13px] text-faint">No photo yet</span>
        )}
        <span className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {off > 0 && <span className="chip bg-success text-white">{off}% off</span>}
          {p.isDeal && <span className="chip bg-ink text-white">Deal</span>}
          {p.badge && <span className="chip bg-gold-50 text-[#7a5a0f] ring-1 ring-gold/40">{p.badge}</span>}
        </span>
        {!available && <span className="absolute inset-x-3 bottom-3 rounded-full bg-ink/80 py-1.5 text-center text-[12px] font-semibold text-white backdrop-blur">Out of stock</span>}
      </Link>
      <CardWishlist item={snapshot} />

      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3">
        {p.brand && <p className="text-[12px] font-bold tracking-[0.08em] text-muted uppercase">{p.brand}</p>}
        {p.sellerName && <p className="-mb-0.5 truncate text-[12px] text-muted">by {p.sellerName}</p>}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[14px] leading-[1.3] font-semibold text-ink">
          <Link href={`/product/${p.slug}`} data-audit-skip className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {p.name}
          </Link>
        </h3>
        {p.ratingCount > 0 && (
          <p className="flex items-center gap-1 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-0.5 text-[12px] font-bold text-white">
              {p.ratingAvg.toFixed(1)} <Star className="size-3 fill-current" aria-hidden />
            </span>
            ({p.ratingCount})
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="text-[18px] font-extrabold tracking-[-0.01em] tabular-nums">{rupees(p.price)}</span>
          {off > 0 && <s className="text-[13px] text-faint tabular-nums">{rupees(p.mrp)}</s>}
        </div>
        {showDeal && dealPct !== null && p.dealSold > 0 && (
          <div className="mt-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-brand))]" style={{ width: `${Math.max(6, dealPct)}%` }} />
            </div>
            <p className="mt-1 text-[12px] text-muted">
              Sold {p.dealSold} of {p.dealQuantity}
            </p>
          </div>
        )}
        <div className="relative z-10 mt-2">
          <CardAddButton item={snapshot} available={available} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, priorityCount = 0, cols = "default" }: { items: Card[]; priorityCount?: number; cols?: "default" | "wide" }) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${cols === "wide" ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
      {items.map((p, i) => (
        <li key={p.id} className={i >= 8 ? "reveal" : undefined}>
          <ProductCard p={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
