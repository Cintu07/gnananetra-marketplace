"use client";

import { useState } from "react";
import { FolderTree, Plus, ExternalLink, CornerDownRight } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input, Textarea } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { ActiveTag } from "@/components/admin/status-tag";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useRun } from "@/components/admin/use-run";
import { deleteCategory, saveCategory } from "@/app/(admin)/admin/actions";

type Row = { id: number; name: string; slug: string; parentId: number | null; description: string | null; image: string | null; sort: number; isVisible: boolean; products: number };
type Draft = Omit<Row, "products" | "id"> & { id?: number };

const EMPTY: Draft = { name: "", slug: "", parentId: null, description: null, image: null, sort: 0, isVisible: true };

export default function CategoriesView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);

  // parents first, each followed by its children
  const ordered: (Row & { depth: number })[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const r of rows.filter((x) => x.parentId === parent)) {
      ordered.push({ ...r, depth });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const r of rows) if (!ordered.some((o) => o.id === r.id)) ordered.push({ ...r, depth: 0 });

  const columns: Column<Row & { depth: number }>[] = [
    {
      key: "name",
      header: "Category",
      cell: (r) => (
        <span className="flex items-center gap-2" style={{ paddingLeft: r.depth * 20 }}>
          {r.depth > 0 && <CornerDownRight className="size-3.5 text-faint" aria-hidden />}
          <span className={r.depth === 0 ? "font-medium" : ""}>{r.name}</span>
        </span>
      ),
    },
    { key: "slug", header: "Address", cell: (r) => <span className="caption-style font-mono text-subtle">/category/{r.slug}</span> },
    { key: "products", header: "Live products", align: "right", cell: (r) => r.products },
    { key: "sort", header: "Order", align: "right", cell: (r) => <span className="text-subtle">{r.sort}</span> },
    { key: "visible", header: "Shop", cell: (r) => <ActiveTag active={r.isVisible} on="shown" off="hidden" /> },
  ];

  return (
    <>
      <PageHeader title="Categories" chip={{ label: `${rows.length} categories`, tone: "muted" }} />
      <Toolbar
        actions={
          <Button variant="primary" size="sm" onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="size-3.5" aria-hidden /> Add category
          </Button>
        }
      >
        <p className="caption-style text-subtle">Lower “order” numbers show first in the menu. Products in a sub-category also appear in its parent.</p>
      </Toolbar>
      <DataTable columns={columns} rows={ordered} rowKey={(r) => String(r.id)} onRowClick={(r) => setDraft({ ...r })} activeKey={draft?.id ? String(draft.id) : null} />

      <DetailSheet
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        icon={<FolderTree />}
        title={draft?.id ? `Edit · ${draft.name}` : "New category"}
        description="Category details"
        footer={
          draft && (
            <>
              {draft.id && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Delete “${draft.name}”? Products stay in the shop; sub-categories move up one level.`)) return;
                    const r = await run(() => deleteCategory(draft.id!));
                    if (r.ok) setDraft(null);
                  }}
                >
                  Delete
                </Button>
              )}
              {draft.id && (
                <Button href={`/category/${draft.slug}`} target="_blank" variant="ghost" size="sm">
                  View <ExternalLink className="size-3" aria-hidden />
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !draft.name}
                onClick={async () => {
                  const r = await run(() => saveCategory({ ...draft, slug: draft.slug || undefined }));
                  if (r.ok) setDraft(null);
                }}
              >
                Save
              </Button>
            </>
          )
        }
      >
        {draft && (
          <DetailSection title="Details" className="shadow-none">
            <Field label="Name" htmlFor="c-name" required>
              <Input id="c-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Web address" htmlFor="c-slug" hint="Changing this breaks old links to the category">
              <Input id="c-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="made from the name" />
            </Field>
            <Field label="Inside" htmlFor="c-parent">
              <Select value={draft.parentId ? String(draft.parentId) : "none"} onValueChange={(v) => setDraft({ ...draft, parentId: v === "none" ? null : Number(v) })}>
                <SelectTrigger id="c-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Top level (a department)</SelectItem>
                  {rows
                    .filter((r) => r.id !== draft.id && !r.parentId)
                    .map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Short description" htmlFor="c-desc" hint="Shown under the title on the category page and to Google">
              <Textarea id="c-desc" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value || null })} />
            </Field>
            <Field label="Tile image" htmlFor="c-img" hint="Optional. Otherwise the best-selling product photo is used.">
              <ImageUploader value={draft.image} nameHint={draft.name} onUploaded={(url) => setDraft({ ...draft, image: url })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Menu order" htmlFor="c-sort">
                <Input id="c-sort" inputMode="numeric" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value.replace(/[^\d-]/g, "")) || 0 })} />
              </Field>
              <label className="flex items-center justify-between gap-2 self-end pb-2 text-[13.5px]">
                Show in shop
                <Switch checked={draft.isVisible} onCheckedChange={(v) => setDraft({ ...draft, isVisible: v })} />
              </label>
            </div>
          </DetailSection>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
