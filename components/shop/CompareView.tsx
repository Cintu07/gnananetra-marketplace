"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitCompareArrows, X } from "lucide-react";
import { addToCart, compareStore, setCartOpen, toggleSaved } from "@/lib/stores";
import { rupees } from "@/lib/money";

type Spec = { slug: string; specs: { title: string; rows: [string, string][] }[]; highlights: string[]; warranty: string | null };

export default function CompareView() {
  const items = compareStore.use();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const slugs = items.map((i) => i.slug).join(",");

  useEffect(() => {
    if (!slugs) return setSpecs([]);
    fetch(`/api/products/compare?slugs=${encodeURIComponent(slugs)}`)
      .then((r) => r.json())
      .then(setSpecs)
      .catch(() => {});
  }, [slugs]);

  if (!items.length)
    return (
      <div className="wrap py-16">
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-14 text-center">
          <GitCompareArrows className="size-10 text-faint" aria-hidden />
          <h1 className="text-[20px] font-extrabold">Compare products side by side</h1>
          <p className="text-[14px] text-muted">Open any product and tap “Compare” to add it here. You can compare up to 4.</p>
          <Link href="/shop" className="btn-primary mt-2">
            Browse products
          </Link>
        </div>
      </div>
    );

  // every spec label that appears in any product, in first-seen order
  const labels: string[] = [];
  const valueOf = new Map<string, Map<string, string>>();
  for (const s of specs) {
    const m = new Map<string, string>();
    for (const g of s.specs)
      for (const [k, v] of g.rows) {
        const key = k.toLowerCase();
        if (!labels.some((l) => l.toLowerCase() === key)) labels.push(k);
        if (!m.has(key)) m.set(key, v);
      }
    valueOf.set(s.slug, m);
  }

  return (
    <div className="wrap py-8">
      <h1 className="text-[28px] font-extrabold tracking-[-0.025em]">Compare products</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="w-44 p-4" />
              {items.map((i) => (
                <th key={i.productId} className="relative p-4 text-left align-top font-normal">
                  <button type="button" aria-label={`Remove ${i.name}`} onClick={() => toggleSaved(compareStore, i)} className="absolute top-2.5 right-2.5 grid size-10 place-items-center rounded-full bg-canvas hover:bg-line">
                    <X className="size-4" aria-hidden />
                  </button>
                  <Link href={`/product/${i.slug}`} className="relative mb-3 block aspect-square w-full max-w-[180px] overflow-hidden rounded-xl bg-white ring-1 ring-line">
                    {i.image && <Image src={i.image} alt="" fill sizes="180px" className="object-contain p-3" />}
                  </Link>
                  <Link href={`/product/${i.slug}`} className="line-clamp-2 font-bold hover:text-brand-700">
                    {i.name}
                  </Link>
                  <p className="mt-1 text-[17px] font-extrabold">{rupees(i.price)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(i, 1);
                      setCartOpen(true);
                    }}
                    className="btn-dark btn-sm mt-3"
                  >
                    Add to cart
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line align-top">
              <th className="bg-canvas/60 p-4 text-left font-semibold text-muted">Highlights</th>
              {items.map((i) => (
                <td key={i.productId} className="p-4">
                  <ul className="list-disc space-y-1 pl-4 text-[13.5px]">
                    {(specs.find((s) => s.slug === i.slug)?.highlights ?? []).slice(0, 5).map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            {labels.slice(0, 60).map((label) => (
              <tr key={label} className="border-t border-line align-top">
                <th className="bg-canvas/60 p-4 text-left font-semibold text-muted">{label}</th>
                {items.map((i) => (
                  <td key={i.productId} className="p-4">
                    {valueOf.get(i.slug)?.get(label.toLowerCase()) ?? <span className="text-faint">-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
