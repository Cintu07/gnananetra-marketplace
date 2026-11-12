import Link from "next/link";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, BadgeCheck, MapPin, Store } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { visible } from "@/lib/catalog";

// "Shop by seller" plus the invitation to sell. Only approved stores that have something on sale.
export default async function SellerStrip() {
  const rows = await db
    .select({ id: s.sellers.id, name: s.sellers.storeName, slug: s.sellers.slug, tagline: s.sellers.tagline, city: s.sellers.city, products: count() })
    .from(s.sellers)
    .innerJoin(s.products, eq(s.products.sellerId, s.sellers.id))
    .where(and(eq(s.sellers.status, "approved"), visible))
    .groupBy(s.sellers.id)
    .orderBy(desc(count()), sql`${s.sellers.id}`)
    .limit(8);
  return (
    <>
      {rows.length > 0 && (
        <section className="reveal wrap mt-12" aria-labelledby="sellers-title">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1.5">Marketplace</p>
              <h2 id="sellers-title" className="section-title">Shop by seller</h2>
            </div>
          </div>
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {rows.map((r) => (
              <li key={r.id} className="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                <Link href={`/store/${r.slug}`} className="group flex h-full flex-col gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-gold-50 text-[20px] font-extrabold text-brand-800 ring-1 ring-brand-200" aria-hidden>
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 text-[15.5px] leading-tight font-bold">
                      {r.name}
                      <BadgeCheck className="size-4 shrink-0 text-success" aria-label="Approved seller" />
                    </span>
                    {r.tagline && <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-muted">{r.tagline}</span>}
                  </span>
                  <span className="mt-auto flex items-center justify-between text-[12.5px] text-muted">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{r.city}</span>
                    <span className="font-semibold text-ink-2 tabular-nums">{r.products} products</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="reveal wrap mt-12" aria-label="Sell on Gnananetra">
        <div className="relative isolate overflow-hidden rounded-3xl bg-night p-7 text-white sm:p-10">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_100%_at_100%_0%,rgb(249_94_6/0.32)_0%,transparent_60%),radial-gradient(60%_80%_at_0%_100%,rgb(208_160_49/0.16)_0%,transparent_65%)]" />
          <div aria-hidden className="grain -z-10" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] text-brand-200 uppercase"><Store className="size-4" aria-hidden /> For sellers</p>
              <h2 className="mt-2 text-[26px] leading-tight font-extrabold tracking-[-0.025em] text-balance sm:text-[32px]">Have something to sell? Open your store on Gnananetra.</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">Free to join. You list and ship; we bring the shoppers and handle checkout. Pay only when you sell.</p>
            </div>
            <Link href="/sell" className="btn-primary shrink-0 px-7 py-4">
              Start selling <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
