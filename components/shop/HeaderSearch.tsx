"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";
import { rupees } from "@/lib/money";

type Suggest = {
  products: { slug: string; name: string; price: number; image: string | null; inStock: boolean }[];
  categories: { slug: string; name: string; count: number }[];
};

export default function HeaderSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: Suggest) => {
          setData(d);
          setActive(-1);
        })
        .catch(() => {});
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const products = data?.products ?? [];

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (active >= 0 && products[active]) {
      router.push(`/product/${products[active].slug}`);
    } else if (q.trim()) {
      router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
    }
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !products.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(products.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && q.trim().length >= 2 && data !== null;

  return (
    <div ref={box} className="relative w-full max-w-2xl">
      <form role="search" onSubmit={submit} className="group relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search printers, laptops, UPS, brands…"
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          className="h-11 w-full rounded-full border border-line bg-canvas pr-28 pl-11 sm:h-12 text-[15px] text-ink outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted focus:border-brand-700 focus:bg-surface focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              setData(null);
            }}
            className="absolute top-1/2 right-[92px] -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        <button type="submit" className="btn-primary absolute top-1 right-1 h-10 min-h-0 px-4 py-0 text-[14px] sm:top-1.5 sm:right-1.5">
          Search
        </button>
      </form>

      {showPanel && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl bg-surface shadow-pop animate-rise">
          {data.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-line p-3">
              {data.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="chip bg-canvas py-1.5 text-ink-2 ring-1 ring-line hover:bg-brand-50 hover:text-brand-800"
                >
                  {c.name} <span className="font-medium text-muted">{c.count}</span>
                </Link>
              ))}
            </div>
          )}
          {products.length === 0 ? (
            <p className="p-5 text-[14px] text-muted">No products match &ldquo;{q}&rdquo;. Try a brand or model number.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto p-1.5">
              {products.map((p, i) => (
                <li key={p.slug} role="option" aria-selected={i === active}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className="flex items-center gap-3 rounded-xl p-2 aria-selected:bg-canvas data-[active=true]:bg-canvas"
                    data-active={i === active}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line">
                      {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-contain p-1" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[14px] font-medium text-ink">{p.name}</span>
                      <span className="text-[13px] text-muted">
                        <span className="font-bold text-ink">{rupees(p.price)}</span>
                        {!p.inStock && <span className="ml-2 text-danger">Out of stock</span>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => submit()}
            className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-[14px] font-semibold text-brand-700 hover:bg-brand-50"
          >
            See all results for &ldquo;{q.trim()}&rdquo;
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
