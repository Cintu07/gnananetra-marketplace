import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { ListQuery, SortKey, listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/shop/ProductCard";
import Breadcrumbs from "@/components/shop/Breadcrumbs";
import Filters, { SortMenu } from "@/components/shop/Filters";

type Result = NonNullable<Awaited<ReturnType<typeof listProducts>>>;
export type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORTS: SortKey[] = ["popular", "newest", "price-asc", "price-desc", "discount", "relevance"];

export function parseListParams(sp: RawParams): ListQuery {
  const num = (k: string) => {
    const n = Number(one(sp[k]));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const sort = one(sp.sort) as SortKey | undefined;
  return {
    q: one(sp.q)?.slice(0, 100) || undefined,
    brands: one(sp.brand)?.split(",").filter(Boolean),
    min: num("min"),
    max: num("max"),
    inStock: one(sp.stock) === "1",
    minDiscount: num("off"),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: num("page"),
  };
}

function pageHref(base: string, sp: RawParams, page: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v);
    if (val && k !== "page") p.set(k, val);
  }
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export default function Listing({
  title,
  intro,
  crumbs,
  base,
  sp,
  result,
  subcategories,
  showCategoryFilter = true,
  showBrandFilter = true,
}: {
  title: string;
  intro?: string | null;
  crumbs: { href?: string; label: string }[];
  base: string;
  sp: RawParams;
  result: Result;
  subcategories?: { slug: string; name: string; count: number }[];
  showCategoryFilter?: boolean;
  showBrandFilter?: boolean;
}) {
  const { items, total, page, pages, sort, brandFacet, priceRange, catalog } = result;
  const tree = showCategoryFilter
    ? catalog.tree.map((c) => ({ slug: c.slug, name: c.name, count: c.count, children: c.children.filter((k) => k.count > 0).map((k) => ({ slug: k.slug, name: k.name, count: k.count })) }))
    : [];
  const from = total ? (page - 1) * 24 + 1 : 0;
  const to = Math.min(total, page * 24);

  return (
    <div className="wrap pt-5 pb-4">
      <Breadcrumbs items={crumbs} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em] sm:text-[32px]">{title}</h1>
          {intro && <p className="mt-1.5 max-w-2xl text-[14.5px] text-muted">{intro}</p>}
        </div>
      </div>

      {subcategories && subcategories.length > 0 && (
        <ul className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {subcategories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={`/category/${c.slug}`} className="chip min-h-10 bg-surface px-3.5 text-[13.5px] text-ink-2 ring-1 ring-line hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200">
                {c.name}
                <span className="font-medium text-muted">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Filters
          tree={tree}
          activeCategory={result.category?.slug ?? null}
          brands={showBrandFilter ? brandFacet : []}
          priceRange={priceRange}
        />
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[14px] text-muted" aria-live="polite">
              {total ? (
                <>
                  Showing <span className="font-semibold text-ink">{from} to {to}</span> of <span className="font-semibold text-ink">{total}</span> products
                </>
              ) : (
                "No products"
              )}
            </p>
            <SortMenu value={sort} hasQuery={Boolean(sp.q)} />
          </div>

          {items.length ? (
            <ProductGrid items={items} priorityCount={4} />
          ) : (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <SearchX className="size-10 text-faint" aria-hidden />
              <p className="text-[17px] font-bold">Nothing matches these filters</p>
              <p className="max-w-sm text-[14px] text-muted">Try removing a filter, or search by brand or model number.</p>
              <Link href={base} className="btn-outline mt-2">
                Clear all filters
              </Link>
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-1.5">
              {page > 1 && (
                <Link href={pageHref(base, sp, page - 1)} className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-line hover:bg-canvas" aria-label="Previous page">
                  <ChevronLeft className="size-4" aria-hidden />
                </Link>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
                .map((n, idx, arr) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {idx > 0 && n - arr[idx - 1] > 1 && <span className="px-1 text-muted">…</span>}
                    <Link
                      href={pageHref(base, sp, n)}
                      aria-current={n === page ? "page" : undefined}
                      className={`grid size-10 place-items-center rounded-full text-[14px] font-semibold ${n === page ? "bg-ink text-white" : "bg-surface ring-1 ring-line hover:bg-canvas"}`}
                    >
                      {n}
                    </Link>
                  </span>
                ))}
              {page < pages && (
                <Link href={pageHref(base, sp, page + 1)} className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-line hover:bg-canvas" aria-label="Next page">
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
