"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, ExternalLink, Star, BellRing, Copy } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { TableFooter, type Column } from "@/components/admin/data-table";
import FilterMenu from "@/components/admin/filter-menu";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input } from "@/components/admin/ui/input";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Switch } from "@/components/admin/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { ProductStatusTag, StockTag } from "@/components/admin/status-tag";
import { RupeeInput } from "@/components/admin/rupee-input";
import { useRun } from "@/components/admin/use-run";
import ExportMenu from "@/components/admin/export-menu";
import { downloadPdf, pdfRupees } from "@/lib/pdf-export";
import { bulkProducts, duplicateProduct, quickUpdateProduct } from "@/app/(admin)/admin/actions";
import { discountPercent, rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  slug: string;
  name: string;
  sku: string | null;
  status: string;
  price: number;
  mrp: number | null;
  stockStatus: string;
  stockQty: number | null;
  lowStockAt: number;
  isFeatured: boolean;
  isDeal: boolean;
  totalSales: number;
  updatedAt: string;
  brand: string | null;
  seller: string | null;
  brandId: number | null;
  image: string | null;
  categoryIds: number[];
  alerts: number;
};

const VIEWS: Record<string, { label: string; match: (r: Row) => boolean }> = {
  all: { label: "All", match: (r) => r.status !== "archived" },
  live: { label: "Live", match: (r) => r.status === "published" },
  draft: { label: "Drafts", match: (r) => r.status === "draft" },
  out: { label: "Out of stock", match: (r) => r.status === "published" && r.stockStatus === "out_of_stock" },
  low: { label: "Low stock", match: (r) => r.stockQty !== null && r.stockQty <= r.lowStockAt && r.status === "published" },
  archived: { label: "Archived", match: (r) => r.status === "archived" },
};

export default function ProductsView({
  rows: serverRows,
  categories,
  brands,
  initialView,
  initialQuery,
}: {
  rows: Row[];
  categories: { id: number; name: string; parentId: number | null }[];
  brands: { id: number; name: string }[];
  initialView: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const { run, busy, toastNode } = useRun();
  const [view, setView] = useState(VIEWS[initialView] ? initialView : "all");
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState("all");
  const [brand, setBrand] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [quick, setQuick] = useState<Row | null>(null);
  const [draft, setDraft] = useState<{ price: number; mrp: number; stockStatus: string; stockQty: string; status: string; isFeatured: boolean; isDeal: boolean } | null>(null);

  // Stock switches: the switch flips the moment it's clicked (override), only that row waits
  // for the save (saving), and a toggled row stays in the list even if it no longer matches the
  // tab (kept), so nothing shifts under the mouse and the next click can't hit a neighbour.
  const [override, setOverride] = useState<Map<number, string>>(new Map());
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [kept, setKept] = useState<Set<number>>(new Set());
  const rows = useMemo(() => serverRows.map((r) => (override.has(r.id) ? { ...r, stockStatus: override.get(r.id)! } : r)), [serverRows, override]);
  useEffect(() => {
    // fresh data arrived: drop overrides the server now agrees with
    setOverride((m) => {
      const next = new Map([...m].filter(([id, st]) => serverRows.find((r) => r.id === id)?.stockStatus !== st));
      return next.size === m.size ? m : next;
    });
  }, [serverRows]);
  useEffect(() => setKept(new Set()), [view, q, cat, brand]);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const descendants = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const c of categories) {
      const set = new Set<number>([c.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const k of categories) if (k.parentId && set.has(k.parentId) && !set.has(k.id)) (set.add(k.id), (grew = true));
      }
      map.set(c.id, set);
    }
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const catSet = cat === "all" ? null : descendants.get(Number(cat));
    return rows.filter(
      (r) =>
        (VIEWS[view].match(r) || kept.has(r.id)) &&
        (!catSet || r.categoryIds.some((id) => catSet.has(id))) &&
        (brand === "all" || String(r.brandId) === brand) &&
        (!needle || [r.name, r.sku, r.brand].some((v) => v?.toLowerCase().includes(needle))),
    );
  }, [rows, view, q, cat, brand, descendants, kept]);

  const tabs = Object.entries(VIEWS).map(([value, v]) => ({ value, label: v.label, count: rows.filter(v.match).length }));
  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  async function toggleStock(r: Row, on: boolean) {
    // a counted product at 0 needs a real count, never a made up one
    if (on && r.stockQty === 0) return openQuick(r);
    const status = on ? "in_stock" : "out_of_stock";
    const edit = (fn: (s: Set<number>) => void) => (prev: Set<number>) => {
      const n = new Set(prev);
      fn(n);
      return n;
    };
    setOverride((m) => new Map(m).set(r.id, status));
    setSaving(edit((n) => n.add(r.id)));
    setKept(edit((n) => n.add(r.id)));
    const res = await run(() => quickUpdateProduct(r.id, { stockStatus: status }));
    setSaving(edit((n) => n.delete(r.id)));
    if (!res.ok)
      setOverride((m) => {
        const n = new Map(m);
        n.delete(r.id);
        return n;
      });
  }

  function openQuick(r: Row) {
    setQuick(r);
    setDraft({ price: r.price, mrp: r.mrp ?? 0, stockStatus: r.stockStatus, stockQty: r.stockQty === null ? "" : String(r.stockQty), status: r.status, isFeatured: r.isFeatured, isDeal: r.isDeal });
  }

  async function bulk(action: Parameters<typeof bulkProducts>[1]) {
    if (action === "delete" && !confirm(`Delete ${selected.size} product(s)? Products that already have orders are archived instead.`)) return;
    const r = await run(() => bulkProducts([...selected], action));
    if (r.ok) setSelected(new Set());
  }

  const columns: Column<Row>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          aria-label="Select all"
          checked={allSelected ? true : selected.size ? "indeterminate" : false}
          onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((r) => r.id)) : new Set())}
        />
      ),
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()} className="flex items-center">
          <Checkbox
            aria-label={`Select ${r.name}`}
            checked={selected.has(r.id)}
            onCheckedChange={(v) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (v) next.add(r.id);
                else next.delete(r.id);
                return next;
              })
            }
          />
        </span>
      ),
    },
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <span className="flex max-w-[380px] items-center gap-3">
          <span className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.image && <img src={r.image} alt="" loading="lazy" className="size-full object-contain p-0.5" />}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{r.name}</span>
              {r.isFeatured && <Star aria-label="Featured" className="size-3 shrink-0 fill-[#D0A031] text-[#D0A031]" />}
            </span>
            <span className="caption-style truncate text-subtle">
              {[r.brand, r.sku, r.categoryIds.map((c) => catName.get(c)).filter(Boolean).slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
            </span>
          </span>
        </span>
      ),
    },
    { key: "seller", header: "Seller", cell: (r) => <span className="caption-style text-soft">{r.seller ?? "Gnananetra"}</span> },
    {
      key: "price",
      header: "Price",
      align: "right",
      cell: (r) => (
        <span className="flex flex-col items-end gap-1">
          <span className="font-medium">{rupees(r.price)}</span>
          {r.mrp && r.mrp > r.price && (
            <span className="caption-style text-subtle">
              <s>{rupees(r.mrp)}</s> · {discountPercent(r.price, r.mrp)}% off
            </span>
          )}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      cell: (r) => (
        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            aria-label={r.stockStatus === "out_of_stock" ? "Mark in stock" : "Mark out of stock"}
            checked={r.stockStatus !== "out_of_stock"}
            disabled={saving.has(r.id)}
            onCheckedChange={(v) => toggleStock(r, v)}
          />
          <StockTag status={r.stockStatus} qty={r.stockQty} low={r.lowStockAt} />
          {r.alerts > 0 && (
            <span title={`${r.alerts} shopper(s) waiting`} className="caption-style flex items-center gap-0.5 text-primary">
              <BellRing className="size-3" aria-hidden />
              {r.alerts}
            </span>
          )}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <ProductStatusTag status={r.status} /> },
    { key: "sold", header: "Sold", align: "right", cell: (r) => <span className="text-soft">{r.totalSales}</span> },
    { key: "updated", header: "Updated", cell: (r) => <span className="caption-style text-subtle">{formatDate(r.updatedAt)}</span> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-sm" aria-label={`Quick edit ${r.name}`} title="Quick edit price and stock" onClick={() => openQuick(r)}>
            <Pencil className="size-3.5" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="View in shop" title="View in shop" href={`/product/${r.slug}`} target="_blank">
            <ExternalLink className="size-3.5" aria-hidden />
          </Button>
        </span>
      ),
    },
  ];

  const topCats = categories.filter((c) => !c.parentId);

  return (
    <>
      <PageHeader
        title="Products"
        tabs={tabs}
        tab={view}
        onTab={(v) => {
          setView(v);
          setSelected(new Set());
        }}
      />
      <Toolbar
        actions={
          <>
            <ExportMenu
              csvHref="/api/admin/export/products"
              csvLabel={`All ${rows.length} products, every column`}
              pdfLabel={`This list: ${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
              onPdf={() =>
                downloadPdf({
                  title: "Products",
                  subtitle: [VIEWS[view].label, cat !== "all" && catName.get(Number(cat)), brand !== "all" && brands.find((b) => String(b.id) === brand)?.name, q && `"${q}"`, `${filtered.length} products`]
                    .filter(Boolean)
                    .join(" · "),
                  filename: `gnananetra-products-${new Date().toISOString().slice(0, 10)}.pdf`,
                  rows: filtered,
                  columns: [
                    { header: "Product", value: (r) => r.name, width: 230 },
                    { header: "Brand", value: (r) => r.brand ?? "" },
                    { header: "SKU", value: (r) => r.sku ?? "" },
                    { header: "Category", value: (r) => r.categoryIds.map((c) => catName.get(c)).filter(Boolean).slice(0, 2).join(", ") },
                    { header: "Price", value: (r) => pdfRupees(r.price), align: "right" },
                    { header: "MRP", value: (r) => (r.mrp && r.mrp > r.price ? pdfRupees(r.mrp) : ""), align: "right" },
                    { header: "Stock", value: (r) => (r.stockStatus === "out_of_stock" ? "Out of stock" : r.stockQty !== null ? `${r.stockQty} units` : "In stock") },
                    { header: "Status", value: (r) => r.status },
                    { header: "Sold", value: (r) => r.totalSales, align: "right" },
                  ],
                  totals: ["", "", "", "", "", "", `${filtered.filter((r) => r.stockStatus !== "out_of_stock").length} in stock`, `${filtered.length} products`, filtered.reduce((n, r) => n + r.totalSales, 0)],
                })
              }
            />
            <Button href="/admin/products/new" variant="primary" size="sm">
              <Plus className="size-3.5" aria-hidden /> Add product
            </Button>
          </>
        }
      >
        <div className="relative w-full sm:w-[260px]">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, brand" className="h-9 pl-8 text-[14px] sm:h-[30px] sm:text-[13px]" />
        </div>
        <FilterMenu
          label="Category"
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: "All" },
            ...topCats.flatMap((c) => [
              { value: String(c.id), label: c.name },
              ...categories.filter((k) => k.parentId === c.id).map((k) => ({ value: String(k.id), label: `   ${k.name}` })),
            ]),
          ]}
        />
        <FilterMenu label="Brand" value={brand} onChange={setBrand} options={[{ value: "all", label: "All" }, ...brands.map((b) => ({ value: String(b.id), label: b.name }))]} />
      </Toolbar>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-[#FFF7ED] px-4 py-2.5">
          <span className="caption-style mr-2 font-medium">{selected.size} selected</span>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("in_stock")}>
            In stock
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("out_of_stock")}>
            Out of stock
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("publish")}>
            Publish
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("draft")}>
            Unpublish
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("feature")}>
            Feature
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("archive")}>
            Archive
          </Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => bulk("delete")}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => String(r.id)}
        onRowClick={(r) => router.push(`/admin/products/${r.id}`)}
        emptyLabel="No products match. Clear the filters or add a product."
        footer={
          <TableFooter
            items={[
              { label: "products", value: filtered.length },
              { label: "in stock", value: filtered.filter((r) => r.stockStatus !== "out_of_stock").length },
              { label: "out of stock", value: filtered.filter((r) => r.stockStatus === "out_of_stock").length },
            ]}
          />
        }
      />

      <DetailSheet
        open={!!quick}
        onOpenChange={(o) => !o && setQuick(null)}
        icon={<Pencil />}
        title={quick ? `Quick edit · ${quick.name}` : ""}
        description="Change price, stock and visibility"
        footer={
          quick && draft ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const r = await run(() => duplicateProduct(quick.id), { refresh: false });
                  if (r.ok && r.data) router.push(`/admin/products/${(r.data as { id: number }).id}`);
                }}
              >
                <Copy className="size-3.5" aria-hidden /> Duplicate
              </Button>
              <Button href={`/admin/products/${quick.id}`} variant="secondary" size="sm">
                Full editor
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  const r = await run(() =>
                    quickUpdateProduct(quick.id, {
                      price: draft.price,
                      mrp: draft.mrp || null,
                      stockStatus: draft.stockStatus as "in_stock",
                      stockQty: draft.stockQty === "" ? null : Number(draft.stockQty),
                      status: draft.status as "published",
                      isFeatured: draft.isFeatured,
                      isDeal: draft.isDeal,
                    }),
                  );
                  if (r.ok) setQuick(null);
                }}
              >
                Save
              </Button>
            </>
          ) : null
        }
      >
        {quick && draft && (
          <>
            <DetailSection title="Price">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Selling price" htmlFor="q-price" required>
                  <RupeeInput id="q-price" valuePaise={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} />
                </Field>
                <Field label="MRP" htmlFor="q-mrp" hint={draft.mrp > draft.price ? `${discountPercent(draft.price, draft.mrp)}% off shown` : "Empty = no strike-through"}>
                  <RupeeInput id="q-mrp" valuePaise={draft.mrp} onChange={(v) => setDraft({ ...draft, mrp: v })} />
                </Field>
              </div>
            </DetailSection>
            <DetailSection title="Stock">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Availability" htmlFor="q-stock">
                  <Select value={draft.stockStatus} onValueChange={(v) => setDraft({ ...draft, stockStatus: v })}>
                    <SelectTrigger id="q-stock">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">In stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of stock</SelectItem>
                      <SelectItem value="preorder">Pre-order</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Units in stock" htmlFor="q-qty" hint="Leave empty if you don't count units">
                  <Input id="q-qty" inputMode="numeric" value={draft.stockQty} onChange={(e) => setDraft({ ...draft, stockQty: e.target.value.replace(/\D/g, "") })} />
                </Field>
              </div>
              {quick.alerts > 0 && <p className="caption-style text-primary">{quick.alerts} shopper(s) asked to be told when this is back. Marking it in stock emails them.</p>}
            </DetailSection>
            <DetailSection title="Visibility" className="shadow-none">
              <Field label="Status" htmlFor="q-status">
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger id="q-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published (live in the shop)</SelectItem>
                    <SelectItem value="draft">Draft (hidden)</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex items-center justify-between text-[13.5px]">
                Featured on the homepage and top of lists
                <Switch checked={draft.isFeatured} onCheckedChange={(v) => setDraft({ ...draft, isFeatured: v })} />
              </label>
              <label className="flex items-center justify-between text-[13.5px]">
                Show in Deals of the day
                <Switch checked={draft.isDeal} onCheckedChange={(v) => setDraft({ ...draft, isDeal: v })} />
              </label>
            </DetailSection>
          </>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
