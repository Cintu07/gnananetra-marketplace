"use client";

import { useMemo, useState } from "react";
import { Search, Save, BellRing, AlertTriangle } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { StockTag } from "@/components/admin/status-tag";
import { useRun } from "@/components/admin/use-run";
import { saveInventory } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/cn";

type Row = { id: number; name: string; sku: string | null; status: string; stockStatus: string; stockQty: number | null; lowStockAt: number; brand: string | null; image: string | null; waiting: number };

const VIEWS: Record<string, { label: string; match: (r: Row) => boolean }> = {
  uncounted: { label: "Not counted", match: (r) => r.stockQty === null && r.stockStatus !== "out_of_stock" },
  all: { label: "All", match: () => true },
  low: { label: "Low", match: (r) => r.stockQty !== null && r.stockQty <= r.lowStockAt },
  out: { label: "Out of stock", match: (r) => r.stockStatus === "out_of_stock" },
};

// One screen to type in real unit counts. Products with a count can never be oversold:
// checkout takes units under a row lock and refuses when none are left.
export default function InventoryView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [view, setView] = useState(rows.some(VIEWS.uncounted.match) ? "uncounted" : "all");
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<number, string>>({});

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => VIEWS[view].match(r) && (!needle || [r.name, r.sku, r.brand].some((v) => v?.toLowerCase().includes(needle))));
  }, [rows, view, q]);
  const changed = Object.entries(edits).filter(([id, v]) => {
    const r = rows.find((x) => x.id === Number(id));
    return r && v !== (r.stockQty === null ? "" : String(r.stockQty));
  });
  const uncounted = rows.filter(VIEWS.uncounted.match).length;

  async function save() {
    const r = await run(() => saveInventory(changed.map(([id, v]) => ({ id: Number(id), stockQty: v === "" ? null : Number(v) }))));
    if (r.ok) setEdits({});
  }

  return (
    <>
      <PageHeader title="Inventory" tabs={Object.entries(VIEWS).map(([value, v]) => ({ value, label: v.label, count: rows.filter(v.match).length }))} tab={view} onTab={setView} />
      <Toolbar
        actions={
          <Button variant="primary" size="sm" disabled={busy || !changed.length} onClick={save}>
            <Save className="size-3.5" aria-hidden /> Save {changed.length || ""} change{changed.length === 1 ? "" : "s"}
          </Button>
        }
      >
        <div className="relative w-full sm:w-[260px]">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, brand" className="h-9 pl-8 text-[14px] sm:h-[30px] sm:text-[13px]" />
        </div>
      </Toolbar>
      <PageBody className="max-w-[900px] pb-24">
        {uncounted > 0 && (
          <Panel className="flex gap-3 border-l-4 border-l-[#B45309]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-[13.5px] leading-relaxed">
              <strong>{uncounted} in-stock products don&apos;t have a unit count.</strong> The old website only knew “in stock” or “out of stock”, so these can be ordered without limit. Type how many you have and the shop will stop selling at zero, even
              if two people check out at the same moment.
            </p>
          </Panel>
        )}
        <Panel className="p-0">
          <ul className="divide-y divide-border">
            {list.map((r) => {
              const value = edits[r.id] ?? (r.stockQty === null ? "" : String(r.stockQty));
              const dirty = edits[r.id] !== undefined && value !== (r.stockQty === null ? "" : String(r.stockQty));
              return (
                <li key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", dirty && "bg-[#FFF7ED]")}>
                  <span className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image && <img src={r.image} alt="" loading="lazy" className="size-full object-contain p-0.5" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[13.5px] font-medium">{r.name}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StockTag status={r.stockStatus} qty={r.stockQty} low={r.lowStockAt} />
                      {r.waiting > 0 && (
                        <span className="caption-style flex items-center gap-0.5 text-primary">
                          <BellRing className="size-3" aria-hidden /> {r.waiting} waiting
                        </span>
                      )}
                      {r.status !== "published" && <span className="caption-style text-subtle">{r.status}</span>}
                    </span>
                  </span>
                  <label className="sr-only" htmlFor={`qty-${r.id}`}>
                    Units of {r.name}
                  </label>
                  <Input
                    id={`qty-${r.id}`}
                    inputMode="numeric"
                    value={value}
                    placeholder="count"
                    onChange={(e) => setEdits({ ...edits, [r.id]: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    onKeyDown={(e) => e.key === "Enter" && changed.length && save()}
                    className={cn("h-10 w-20 text-center text-[15px] tabular-nums sm:h-9", dirty && "border-primary")}
                  />
                </li>
              );
            })}
            {list.length === 0 && <li className="caption-style p-10 text-center text-subtle">Nothing here.</li>}
          </ul>
        </Panel>
        <p className="caption-style leading-relaxed text-subtle">Empty means “not counted”. 0 marks it out of stock. Any number above 0 marks it in stock and emails shoppers who asked to be told.</p>
      </PageBody>
      {changed.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <span className="text-[13.5px]">{changed.length} unsaved</span>
          <Button variant="primary" size="md" disabled={busy} onClick={save}>
            Save changes
          </Button>
        </div>
      )}
      {toastNode}
    </>
  );
}
