"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, Check } from "lucide-react";

type TreeNode = { slug: string; name: string; count: number; children: { slug: string; name: string; count: number }[] };

function useParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { params, update, pending, pathname };
}

const PRICE_BANDS: [number, number | null, string][] = [
  [0, 10000, "Under ₹10,000"],
  [10000, 25000, "₹10,000 to ₹25,000"],
  [25000, 50000, "₹25,000 to ₹50,000"],
  [50000, 100000, "₹50,000 to ₹1,00,000"],
  [100000, null, "Above ₹1,00,000"],
];

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-4 last:border-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 w-full items-center justify-between text-left text-[14px] font-bold text-ink">
        {title}
        <ChevronDown className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] ring-1 transition-colors ${on ? "bg-brand-700 ring-brand-700" : "bg-surface ring-line-2"}`}>
      {on && <Check className="size-3 text-white" strokeWidth={3} aria-hidden />}
    </span>
  );
}

function Panel({
  tree,
  activeCategory,
  brands,
  priceRange,
}: {
  tree: TreeNode[];
  activeCategory: string | null;
  brands: { slug: string; name: string; count: number }[];
  priceRange: { min: number; max: number };
}) {
  const { params, update } = useParamsUpdater();
  const selectedBrands = (params.get("brand") ?? "").split(",").filter(Boolean);
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  useEffect(() => {
    setMin(params.get("min") ?? "");
    setMax(params.get("max") ?? "");
  }, [params]);
  const qs = params.toString();
  const keep = (slug: string) => `/category/${slug}${qs ? `?${new URLSearchParams([...params.entries()].filter(([k]) => k !== "page" && k !== "brand")).toString()}` : ""}`;

  return (
    <div>
      {tree.length > 0 && (
        <Group title="Category">
          <ul className="space-y-0.5 text-[14px]">
            {tree.map((c) => {
              const inBranch = activeCategory === c.slug || c.children.some((k) => k.slug === activeCategory);
              return (
                <li key={c.slug}>
                  <Link
                    href={keep(c.slug)}
                    className={`flex items-center justify-between rounded-lg px-2 py-2.5 lg:py-1.5 ${activeCategory === c.slug ? "bg-brand-50 font-bold text-brand-800" : "text-body hover:bg-canvas hover:text-ink"}`}
                  >
                    {c.name}
                    <span className="text-[12px] text-muted">{c.count}</span>
                  </Link>
                  {inBranch && c.children.length > 0 && (
                    <ul className="mt-0.5 mb-1 ml-3 border-l border-line pl-2">
                      {c.children.map((k) => (
                        <li key={k.slug}>
                          <Link
                            href={keep(k.slug)}
                            className={`flex items-center justify-between rounded-lg px-2 py-2.5 lg:py-1.5 text-[13.5px] ${activeCategory === k.slug ? "bg-brand-50 font-bold text-brand-800" : "text-body hover:bg-canvas"}`}
                          >
                            {k.name}
                            <span className="text-[12px] text-muted">{k.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      {brands.length > 0 && (
        <Group title="Brand">
          <ul className="space-y-1 text-[14px]">
            {brands.map((b) => {
              const on = selectedBrands.includes(b.slug);
              return (
                <li key={b.slug}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => update({ brand: (on ? selectedBrands.filter((x) => x !== b.slug) : [...selectedBrands, b.slug]).join(",") || null })}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 lg:py-1.5 text-left text-body hover:bg-canvas"
                  >
                    <Tick on={on} />
                    <span className="flex-1">{b.name}</span>
                    <span className="text-[12px] text-muted">{b.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      <Group title="Price">
        <ul className="space-y-1 text-[14px]">
          {PRICE_BANDS.filter(([lo, hi]) => lo < priceRange.max && (hi === null || hi > priceRange.min)).map(([lo, hi, label]) => {
            const on = (params.get("min") ?? "") === (lo ? String(lo) : "") && (params.get("max") ?? "") === (hi ? String(hi) : "") && (lo > 0 || hi !== null);
            return (
              <li key={label}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update(on ? { min: null, max: null } : { min: lo ? String(lo) : null, max: hi ? String(hi) : null })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 lg:py-1.5 text-left text-body hover:bg-canvas"
                >
                  <Tick on={on} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ min: min || null, max: max || null });
          }}
        >
          <label className="sr-only" htmlFor="pmin">
            Minimum price
          </label>
          <input id="pmin" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="Min ₹" className="field h-10 px-3 py-0 text-[14px]" />
          <span className="text-muted">to</span>
          <label className="sr-only" htmlFor="pmax">
            Maximum price
          </label>
          <input id="pmax" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max ₹" className="field h-10 px-3 py-0 text-[14px]" />
          <button className="btn-dark h-10 px-3 py-0 text-[13px]">Go</button>
        </form>
      </Group>

      <Group title="Offers and availability">
        <ul className="space-y-1 text-[14px]">
          <li>
            <button
              type="button"
              role="checkbox"
              aria-checked={params.get("stock") === "1"}
              onClick={() => update({ stock: params.get("stock") === "1" ? null : "1" })}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 lg:py-1.5 text-left text-body hover:bg-canvas"
            >
              <Tick on={params.get("stock") === "1"} />
              In stock only
            </button>
          </li>
          {[10, 20, 30].map((d) => (
            <li key={d}>
              <button
                type="button"
                role="radio"
                aria-checked={params.get("off") === String(d)}
                onClick={() => update({ off: params.get("off") === String(d) ? null : String(d) })}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 lg:py-1.5 text-left text-body hover:bg-canvas"
              >
                <Tick on={params.get("off") === String(d)} />
                {d}% off or more
              </button>
            </li>
          ))}
        </ul>
      </Group>
    </div>
  );
}

export default function Filters(props: Parameters<typeof Panel>[0]) {
  const [open, setOpen] = useState(false);
  const { params, pathname } = useParamsUpdater();
  const active = ["brand", "min", "max", "stock", "off"].filter((k) => params.get(k)).length;
  useEffect(() => setOpen(false), [params]);
  const clearHref = params.get("q") ? `${pathname}?q=${encodeURIComponent(params.get("q")!)}` : pathname;

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-[150px] max-h-[calc(100dvh-170px)] overflow-y-auto rounded-2xl bg-surface px-4 ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-line py-3.5">
            <h2 className="text-[15px] font-extrabold">Filters</h2>
            {active > 0 && (
              <Link href={clearHref} className="text-[13px] font-semibold text-brand-700 hover:underline">
                Clear all
              </Link>
            )}
          </div>
          <Panel {...props} />
        </div>
      </aside>

      <div className="-mb-2 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn-outline btn-sm">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters{active > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-700 text-[12px] text-white">{active}</span>}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-night/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface animate-rise">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[17px] font-extrabold">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="grid size-10 place-items-center rounded-full hover:bg-canvas">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-8">
              <Panel {...props} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const SORT_LABEL: Record<string, string> = {
  relevance: "Best match",
  popular: "Popular",
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  discount: "Biggest discount",
};

export function SortMenu({ value, hasQuery }: { value: string; hasQuery: boolean }) {
  const { update, pending } = useParamsUpdater();
  const options = Object.entries(SORT_LABEL).filter(([k]) => k !== "relevance" || hasQuery);
  return (
    <label className="flex items-center gap-2 text-[14px]">
      <span className="hidden text-muted sm:inline">Sort by</span>
      <select
        value={value}
        onChange={(e) => update({ sort: e.target.value })}
        className={`h-10 rounded-full bg-surface pr-9 pl-4 text-[14px] font-semibold ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-700 ${pending ? "opacity-60" : ""}`}
      >
        {options.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
