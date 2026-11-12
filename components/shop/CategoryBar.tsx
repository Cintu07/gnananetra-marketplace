"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, Flame } from "lucide-react";

export type NavCategory = { name: string; slug: string; count: number; children: { name: string; slug: string; count: number }[] };

// Desktop category strip under the header: "All categories" mega panel, then the main
// departments inline, each with a small dropdown of sub-categories.
export default function CategoryBar({ nav }: { nav: NavCategory[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enter = (key: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(key), 90);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(null), 160);
  };

  const inline = nav.slice(0, 6);

  return (
    <nav aria-label="Categories" className="hidden border-t border-line lg:block" onMouseLeave={leave}>
      <div className="wrap relative flex h-12 items-center gap-1">
        <div onMouseEnter={() => enter("all")}>
          <button
            type="button"
            aria-expanded={open === "all"}
            onClick={() => setOpen(open === "all" ? null : "all")}
            className="mr-2 flex h-9 items-center gap-2 rounded-full bg-ink px-4 whitespace-nowrap text-[13.5px] font-semibold text-white hover:bg-ink-2"
          >
            <LayoutGrid className="size-4" aria-hidden />
            All categories
            <ChevronDown className={`size-3.5 transition-transform ${open === "all" ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </div>

        {inline.map((c) => (
          <div key={c.slug} className="relative" onMouseEnter={() => (c.children.length ? enter(c.slug) : enter(""))}>
            <Link
              href={`/category/${c.slug}`}
              aria-expanded={c.children.length ? open === c.slug : undefined}
              className={`flex h-9 items-center gap-1 rounded-full px-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${
                pathname === `/category/${c.slug}` ? "bg-brand-50 text-brand-800" : "text-ink-2 hover:bg-canvas hover:text-ink"
              }`}
            >
              {c.name}
              {c.children.length > 0 && <ChevronDown className="size-3.5 text-muted" aria-hidden />}
            </Link>
            {open === c.slug && c.children.length > 0 && (
              <div className="absolute top-full left-0 z-50 pt-2">
                <ul className="w-64 rounded-2xl bg-surface p-2 shadow-pop animate-rise">
                  <li>
                    <Link href={`/category/${c.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-bold text-ink hover:bg-canvas">
                      All {c.name.toLowerCase()}
                      <span className="text-[12px] font-medium text-muted">{c.count}</span>
                    </Link>
                  </li>
                  {c.children.map((k) => (
                    <li key={k.slug}>
                      <Link href={`/category/${k.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2 text-[14px] text-body hover:bg-canvas hover:text-ink">
                        {k.name}
                        <span className="text-[12px] text-muted">{k.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        <Link href="/deals" className="ml-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-bold whitespace-nowrap text-brand-700 hover:bg-brand-50">
          <Flame className="size-4" aria-hidden />
          Deals
        </Link>
        <Link href="/contact?topic=bulk" className="hidden h-9 items-center rounded-full px-3 text-[13.5px] font-semibold whitespace-nowrap text-ink-2 hover:bg-canvas xl:flex">
          Bulk orders
        </Link>

        {open === "all" && (
          <div className="absolute inset-x-4 top-full z-50 pt-2 sm:inset-x-6" onMouseEnter={() => enter("all")}>
            <div className="grid grid-cols-4 gap-x-6 gap-y-5 rounded-3xl bg-surface p-6 shadow-pop animate-rise xl:grid-cols-5">
              {nav.map((c) => (
                <div key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="group flex items-baseline justify-between gap-2 border-b border-line pb-2 text-[14.5px] font-bold text-ink hover:text-brand-700">
                    {c.name}
                    <span className="text-[12px] font-medium text-muted group-hover:text-brand-700">{c.count}</span>
                  </Link>
                  {c.children.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {c.children.map((k) => (
                        <li key={k.slug}>
                          <Link href={`/category/${k.slug}`} className="block rounded-lg py-1 text-[13.5px] text-body hover:text-brand-700">
                            {k.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
