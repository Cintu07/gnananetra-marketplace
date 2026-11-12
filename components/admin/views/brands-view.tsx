"use client";

import { useState } from "react";
import { Tags, Plus } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { ActiveTag } from "@/components/admin/status-tag";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useRun } from "@/components/admin/use-run";
import { deleteBrand, saveBrand } from "@/app/(admin)/admin/actions";

type Row = { id: number; name: string; slug: string; logo: string | null; isVisible: boolean; sort: number; products: number };
type Draft = Omit<Row, "products" | "id"> & { id?: number };

export default function BrandsView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Brand",
      cell: (r) => (
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center overflow-hidden rounded-md border border-border bg-white text-[11px] font-semibold text-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.logo ? <img src={r.logo} alt="" className="size-full object-contain p-0.5" /> : r.name.slice(0, 2)}
          </span>
          <span className="font-medium">{r.name}</span>
        </span>
      ),
    },
    { key: "slug", header: "Address", cell: (r) => <span className="caption-style font-mono text-subtle">/brand/{r.slug}</span> },
    { key: "products", header: "Live products", align: "right", cell: (r) => r.products },
    { key: "visible", header: "Shop", cell: (r) => <ActiveTag active={r.isVisible} on="shown" off="hidden" /> },
  ];

  return (
    <>
      <PageHeader title="Brands" chip={{ label: `${rows.length} brands`, tone: "muted" }} />
      <Toolbar
        actions={
          <Button variant="primary" size="sm" onClick={() => setDraft({ name: "", slug: "", logo: null, isVisible: true, sort: 0 })}>
            <Plus className="size-3.5" aria-hidden /> Add brand
          </Button>
        }
      />
      <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} onRowClick={(r) => setDraft({ ...r })} activeKey={draft?.id ? String(draft.id) : null} />
      <DetailSheet
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        icon={<Tags />}
        title={draft?.id ? `Edit · ${draft.name}` : "New brand"}
        description="Brand details"
        footer={
          draft && (
            <>
              {draft.id && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Delete brand “${draft.name}”? Its products stay, without a brand.`)) return;
                    const r = await run(() => deleteBrand(draft.id!));
                    if (r.ok) setDraft(null);
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !draft.name}
                onClick={async () => {
                  const r = await run(() => saveBrand({ ...draft, slug: draft.slug || undefined }));
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
            <Field label="Name" htmlFor="b-name" required>
              <Input id="b-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Web address" htmlFor="b-slug">
              <Input id="b-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="made from the name" />
            </Field>
            <Field label="Logo" htmlFor="b-logo" hint="Optional">
              <ImageUploader value={draft.logo} nameHint={`${draft.name}-logo`} onUploaded={(url) => setDraft({ ...draft, logo: url })} />
            </Field>
            <label className="flex items-center justify-between text-[13.5px]">
              Show in the shop
              <Switch checked={draft.isVisible} onCheckedChange={(v) => setDraft({ ...draft, isVisible: v })} />
            </label>
          </DetailSection>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
