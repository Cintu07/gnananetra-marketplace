"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, ExternalLink, Star, ClipboardPaste, GripVertical } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input, Textarea } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { RupeeInput } from "@/components/admin/rupee-input";
import { ImageDrop } from "@/components/admin/ImageUploader";
import RichText from "@/components/admin/rich-text";
import { useRun } from "@/components/admin/use-run";
import { saveProduct, type ProductInput } from "@/app/(admin)/admin/actions";
import { discountPercent, rupees } from "@/lib/money";
import { cn } from "@/lib/cn";

export type ProductFormValue = ProductInput & { id?: number };

const EMPTY: ProductFormValue = {
  name: "",
  slug: "",
  sku: null,
  brandId: null,
  categoryIds: [],
  status: "draft",
  price: 0,
  mrp: null,
  costPrice: null,
  stockStatus: "in_stock",
  stockQty: null,
  lowStockAt: 3,
  maxPerOrder: null,
  highlights: [],
  specs: [],
  descriptionHtml: "",
  badge: null,
  isFeatured: false,
  isDeal: false,
  dealEndsAt: null,
  dealQuantity: null,
  gstRate: 18,
  hsn: null,
  warranty: null,
  weightKg: null,
  seoTitle: null,
  seoDescription: null,
  images: [],
};

function Section({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <Panel className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[14px]">{title}</h2>
        {hint && <p className="caption-style leading-snug text-subtle">{hint}</p>}
      </div>
      {children}
    </Panel>
  );
}

const localInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default function ProductForm({
  initial,
  categories,
  brands,
  meta,
}: {
  initial: ProductFormValue | null;
  categories: { id: number; name: string; parentId: number | null }[];
  brands: { id: number; name: string }[];
  meta: { totalSales: number; rating: number; ratingCount: number; alerts: number; wpId: number | null } | null;
}) {
  const router = useRouter();
  const { run, busy, toastNode } = useRun();
  const [v, setV] = useState<ProductFormValue>(initial ?? EMPTY);
  const [dirty, setDirty] = useState(false);
  const [paste, setPaste] = useState<number | null>(null);
  const [pasteText, setPasteText] = useState("");
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    setDirty(true);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const margin = v.costPrice && v.price ? Math.round(((v.price - v.costPrice) / v.price) * 100) : null;

  async function save(status?: ProductFormValue["status"]) {
    const payload = { ...v, ...(status ? { status } : {}) };
    const r = await run(() => saveProduct(payload), { refresh: false });
    if (r.ok && r.data) {
      setDirty(false);
      const { id, slug } = r.data as { id: number; slug: string };
      setV((x) => ({ ...x, id, slug, ...(status ? { status } : {}) }));
      if (!v.id) router.replace(`/admin/products/${id}`);
      else router.refresh();
    }
  }

  function moveImage(i: number, d: number) {
    const next = [...v.images];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("images", next);
  }

  function applyPaste(groupIndex: number) {
    const rows = pasteText
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.split(/\s*[:\t：|]\s*/);
        return [m[0] ?? "", m.slice(1).join(" ").trim()] as [string, string];
      })
      .filter(([k, val]) => k && val);
    const specs = [...v.specs];
    specs[groupIndex] = { ...specs[groupIndex], rows: [...specs[groupIndex].rows, ...rows] };
    set("specs", specs);
    setPaste(null);
    setPasteText("");
  }

  const title = v.id ? v.name || "Product" : "New product";

  return (
    <>
      <PageHeader title={title} chip={v.id ? { label: v.status === "published" ? "Live" : v.status, tone: v.status === "published" ? "live" : "warn" } : { label: "Not saved yet", tone: "muted" }} />
      <PageBody className="max-w-[1240px] pb-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button href="/admin/products" variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" aria-hidden /> Products
          </Button>
          {v.id && v.slug && (
            <Button href={`/product/${v.slug}`} target="_blank" variant="ghost" size="sm">
              View in shop <ExternalLink className="size-3.5" aria-hidden />
            </Button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <Section title="Basics">
              <Field label="Product name" htmlFor="name" required hint="Shown as the title in the shop and on invoices.">
                <Input id="name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. HP LaserJet Pro 4004d Printer" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand" htmlFor="brand">
                  <Select value={v.brandId ? String(v.brandId) : "none"} onValueChange={(x) => set("brandId", x === "none" ? null : Number(x))}>
                    <SelectTrigger id="brand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No brand</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="SKU / model code" htmlFor="sku">
                  <Input id="sku" value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value || null)} />
                </Field>
              </div>
              <Field label="Web address" htmlFor="slug" hint={`gnananetra.co.in/product/${v.slug || "made-from-the-name"}`}>
                <Input id="slug" value={v.slug ?? ""} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="leave empty to make it from the name" />
              </Field>
            </Section>

            <Section title="Photos" hint="The first photo is the main one. Use clear product shots on a white background for the best look.">
              {v.images.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {v.images.map((img, i) => (
                    <li key={img.url} className={cn("group relative overflow-hidden rounded-lg border bg-white", i === 0 ? "border-primary" : "border-border")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt ?? ""} className="aspect-square w-full object-contain p-2" />
                      {i === 0 && <span className="caption-style absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-1 text-white">Main</span>}
                      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        <span className="flex gap-1">
                          <Button variant="secondary" size="icon-sm" aria-label="Move earlier" onClick={() => moveImage(i, -1)} disabled={i === 0}>
                            <ArrowUp className="size-3 -rotate-90" aria-hidden />
                          </Button>
                          <Button variant="secondary" size="icon-sm" aria-label="Move later" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1}>
                            <ArrowDown className="size-3 -rotate-90" aria-hidden />
                          </Button>
                        </span>
                        <Button variant="danger" size="icon-sm" aria-label="Remove photo" onClick={() => set("images", v.images.filter((_, k) => k !== i))}>
                          <Trash2 className="size-3" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <ImageDrop
                nameHint={v.name || "product"}
                onUploaded={(img) => {
                  setDirty(true);
                  setV((x) => ({ ...x, images: [...x.images, { url: img.url, alt: x.name || null, width: img.width, height: img.height }] }));
                }}
              />
            </Section>

            <Section title="Key highlights" hint="Short bullet points next to the price. 3 to 6 work best.">
              <ul className="flex flex-col gap-2">
                {v.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <GripVertical className="size-3.5 shrink-0 text-faint" aria-hidden />
                    <Input
                      value={h}
                      aria-label={`Highlight ${i + 1}`}
                      onChange={(e) => {
                        const next = [...v.highlights];
                        next[i] = e.target.value;
                        set("highlights", next);
                      }}
                    />
                    <Button variant="ghost" size="icon" aria-label="Remove highlight" onClick={() => set("highlights", v.highlights.filter((_, k) => k !== i))}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" className="self-start" onClick={() => set("highlights", [...v.highlights, ""])}>
                <Plus className="size-3.5" aria-hidden /> Add highlight
              </Button>
            </Section>

            <Section title="Specifications" hint="Shown as tables on the product page and used by Compare. Tip: paste “Label: value” lines from a brochure.">
              {v.specs.map((g, gi) => (
                <div key={gi} className="rounded-lg border border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-2">
                    <Input
                      value={g.title}
                      aria-label="Group name"
                      onChange={(e) => {
                        const specs = [...v.specs];
                        specs[gi] = { ...g, title: e.target.value };
                        set("specs", specs);
                      }}
                      className="h-8 font-medium"
                      placeholder="Group, e.g. Printing"
                    />
                    <Button variant="ghost" size="sm" onClick={() => setPaste(paste === gi ? null : gi)}>
                      <ClipboardPaste className="size-3.5" aria-hidden /> Paste
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Remove group" onClick={() => set("specs", v.specs.filter((_, k) => k !== gi))}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                  {paste === gi && (
                    <div className="flex flex-col gap-2 border-b border-border p-2">
                      <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"Print speed: 40 ppm\nConnectivity: USB, Wi-Fi"} />
                      <Button variant="primary" size="sm" className="self-end" onClick={() => applyPaste(gi)}>
                        Add rows
                      </Button>
                    </div>
                  )}
                  <ul className="flex flex-col gap-1.5 p-2">
                    {g.rows.map(([k, val], ri) => (
                      <li key={ri} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-1.5">
                        <Input
                          value={k}
                          aria-label="Label"
                          placeholder="Label"
                          className="h-8"
                          onChange={(e) => {
                            const specs = [...v.specs];
                            const rows = [...g.rows];
                            rows[ri] = [e.target.value, val];
                            specs[gi] = { ...g, rows };
                            set("specs", specs);
                          }}
                        />
                        <Input
                          value={val}
                          aria-label="Value"
                          placeholder="Value"
                          className="h-8"
                          onChange={(e) => {
                            const specs = [...v.specs];
                            const rows = [...g.rows];
                            rows[ri] = [k, e.target.value];
                            specs[gi] = { ...g, rows };
                            set("specs", specs);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove row"
                          onClick={() => {
                            const specs = [...v.specs];
                            specs[gi] = { ...g, rows: g.rows.filter((_, k2) => k2 !== ri) };
                            set("specs", specs);
                          }}
                        >
                          <Trash2 className="size-3" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="px-2 pb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const specs = [...v.specs];
                        specs[gi] = { ...g, rows: [...g.rows, ["", ""]] };
                        set("specs", specs);
                      }}
                    >
                      <Plus className="size-3.5" aria-hidden /> Row
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" className="self-start" onClick={() => set("specs", [...v.specs, { title: v.specs.length ? "" : "Specifications", rows: [["", ""]] }])}>
                <Plus className="size-3.5" aria-hidden /> Add spec group
              </Button>
            </Section>

            <Section title="Description" hint="The longer story about the product. Shown in the Overview section.">
              <RichText value={v.descriptionHtml} onChange={(html) => set("descriptionHtml", html)} placeholder="What it does, who it's for, what's in the box…" />
            </Section>

            <Section title="Search engines" hint="Optional. Leave empty and we'll use the product name and highlights.">
              <Field label="Page title" htmlFor="seot">
                <Input id="seot" value={v.seoTitle ?? ""} maxLength={120} onChange={(e) => set("seoTitle", e.target.value || null)} placeholder={v.name} />
              </Field>
              <Field label="Description" htmlFor="seod" hint={`${(v.seoDescription ?? "").length}/160 characters`}>
                <Textarea id="seod" value={v.seoDescription ?? ""} maxLength={300} onChange={(e) => set("seoDescription", e.target.value || null)} />
              </Field>
              <div className="rounded-lg border border-border bg-white p-3">
                <p className="caption-style text-[#1a7f37]">gnananetra.co.in › product › {v.slug || "…"}</p>
                <p className="mt-1.5 truncate text-[16px] text-[#1a0dab]">{v.seoTitle || v.name || "Product name"} | Gnananetra</p>
                <p className="mt-1 line-clamp-2 text-[13px] text-soft">{v.seoDescription || v.highlights.filter(Boolean).join(". ") || "Description from highlights"}</p>
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-4">
            <Section title="Status">
              <Select value={v.status} onValueChange={(x) => set("status", x as ProductFormValue["status"])}>
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published · live in the shop</SelectItem>
                  <SelectItem value="draft">Draft · hidden</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {meta && (
                <p className="caption-style leading-snug text-subtle">
                  Sold {meta.totalSales}
                  {meta.ratingCount ? ` · ${meta.rating.toFixed(1)}★ from ${meta.ratingCount}` : ""}
                  {meta.wpId ? ` · imported from WordPress #${meta.wpId}` : ""}
                </p>
              )}
            </Section>

            <Section title="Price">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Selling price" htmlFor="price" required>
                  <RupeeInput id="price" valuePaise={v.price} onChange={(x) => set("price", x)} />
                </Field>
                <Field label="MRP" htmlFor="mrp">
                  <RupeeInput id="mrp" valuePaise={v.mrp ?? 0} onChange={(x) => set("mrp", x || null)} />
                </Field>
              </div>
              {v.mrp && v.mrp > v.price ? (
                <p className="caption-style text-success">
                  Shows {discountPercent(v.price, v.mrp)}% off · saves {rupees(v.mrp - v.price)}
                </p>
              ) : null}
              <Field label="Your cost (private)" htmlFor="cost" hint={margin !== null ? `Margin ${margin}% · ${rupees(v.price - (v.costPrice ?? 0))}` : "Only admins see this. Used for margin."}>
                <RupeeInput id="cost" valuePaise={v.costPrice ?? 0} onChange={(x) => set("costPrice", x || null)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="GST rate" htmlFor="gst" hint="Prices include GST">
                  <Select value={String(v.gstRate)} onValueChange={(x) => set("gstRate", Number(x))}>
                    <SelectTrigger id="gst">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 5, 12, 18, 28, 40].map((r) => (
                        <SelectItem key={r} value={String(r)}>
                          {r}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="HSN code" htmlFor="hsn">
                  <Input id="hsn" value={v.hsn ?? ""} onChange={(e) => set("hsn", e.target.value.replace(/\D/g, "") || null)} placeholder="8443" />
                </Field>
              </div>
            </Section>

            <Section title="Stock">
              <Select value={v.stockStatus} onValueChange={(x) => set("stockStatus", x as ProductFormValue["stockStatus"])}>
                <SelectTrigger aria-label="Availability">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  <SelectItem value="preorder">Pre-order</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center justify-between text-[13.5px]">
                Count units
                <Switch checked={v.stockQty !== null} onCheckedChange={(on) => set("stockQty", on ? 10 : null)} />
              </label>
              {v.stockQty !== null && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Units in stock" htmlFor="qty" hint="Goes down with each order">
                    <Input id="qty" inputMode="numeric" value={v.stockQty} onChange={(e) => set("stockQty", Number(e.target.value.replace(/\D/g, "") || 0))} />
                  </Field>
                  <Field label="Warn me at" htmlFor="low">
                    <Input id="low" inputMode="numeric" value={v.lowStockAt} onChange={(e) => set("lowStockAt", Number(e.target.value.replace(/\D/g, "") || 0))} />
                  </Field>
                </div>
              )}
              <Field label="Max per order" htmlFor="max" hint="Optional limit per customer order">
                <Input id="max" inputMode="numeric" value={v.maxPerOrder ?? ""} onChange={(e) => set("maxPerOrder", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)} />
              </Field>
              {meta && meta.alerts > 0 && <p className="caption-style leading-snug text-primary">{meta.alerts} shopper(s) are waiting for this. Saving it as in stock emails them automatically.</p>}
            </Section>

            <Section title="Categories" hint="Pick the most specific one; parents are included automatically in the shop.">
              <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto pr-1">
                {roots.map((c) => (
                  <div key={c.id}>
                    {[c, ...categories.filter((k) => k.parentId === c.id)].map((k) => (
                      <label key={k.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md py-1.5 text-[13.5px] hover:bg-muted", k.parentId ? "pl-6" : "pl-1 font-medium")}>
                        <Checkbox checked={v.categoryIds.includes(k.id)} onCheckedChange={(on) => set("categoryIds", on ? [...v.categoryIds, k.id] : v.categoryIds.filter((x) => x !== k.id))} />
                        {k.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Merchandising">
              <label className="flex items-center justify-between text-[13.5px]">
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 text-[#D0A031]" aria-hidden /> Featured
                </span>
                <Switch checked={v.isFeatured} onCheckedChange={(x) => set("isFeatured", x)} />
              </label>
              <label className="flex items-center justify-between text-[13.5px]">
                Deal of the day
                <Switch checked={v.isDeal} onCheckedChange={(x) => set("isDeal", x)} />
              </label>
              {v.isDeal && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Deal ends" htmlFor="dend" hint="Empty = ends every midnight">
                    <Input id="dend" type="datetime-local" value={localInput(v.dealEndsAt)} onChange={(e) => set("dealEndsAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
                  </Field>
                  <Field label="Deal quantity" htmlFor="dqty" hint="Shows a ‘sold x of y’ bar">
                    <Input id="dqty" inputMode="numeric" value={v.dealQuantity ?? ""} onChange={(e) => set("dealQuantity", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)} />
                  </Field>
                </div>
              )}
              <Field label="Badge" htmlFor="badge" hint="Small label on the photo, e.g. ‘Best seller’">
                <Input id="badge" value={v.badge ?? ""} maxLength={40} onChange={(e) => set("badge", e.target.value || null)} />
              </Field>
              <Field label="Warranty" htmlFor="war">
                <Input id="war" value={v.warranty ?? ""} onChange={(e) => set("warranty", e.target.value || null)} placeholder="1 year manufacturer warranty" />
              </Field>
            </Section>
          </div>
        </div>
      </PageBody>

      <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <span className="caption-style mr-auto text-subtle">{dirty ? "Unsaved changes" : v.id ? "All changes saved" : ""}</span>
        {v.status !== "published" && (
          <Button variant="secondary" size="md" disabled={busy || !v.name} onClick={() => save()}>
            Save draft
          </Button>
        )}
        <Button variant="primary" size="md" disabled={busy || !v.name || !v.price} onClick={() => save(v.status === "draft" && !v.id ? "published" : undefined)}>
          {busy ? "Saving…" : v.status === "published" || !v.id ? (v.id ? "Save changes" : "Save and publish") : "Save"}
        </Button>
      </div>
      {toastNode}
    </>
  );
}
