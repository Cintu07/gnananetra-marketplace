"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Plus } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import DataTable, { type Column } from "@/components/admin/data-table";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input, Textarea } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { ActiveTag } from "@/components/admin/status-tag";
import RichText from "@/components/admin/rich-text";
import { useRun } from "@/components/admin/use-run";
import { deletePage, savePage } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/site";

type Row = { id: number; slug: string; title: string; contentHtml: string; seoDescription: string | null; isPublished: boolean; showInFooter: boolean; sort: number; updatedAt: string };
type Draft = Omit<Row, "id" | "updatedAt"> & { id?: number };

export default function PagesView({ rows, editId }: { rows: Row[]; editId: number | null }) {
  const router = useRouter();
  const { run, busy, toastNode } = useRun();
  const start = editId === 0 ? { slug: "", title: "", contentHtml: "", seoDescription: null, isPublished: true, showInFooter: true, sort: rows.length + 1 } : rows.find((r) => r.id === editId) ?? null;
  const [draft, setDraft] = useState<Draft | null>(start ? { ...start } : null);

  if (draft) {
    return (
      <>
        <PageHeader title={draft.id ? draft.title || "Page" : "New page"} />
        <PageBody className="max-w-[980px] pb-24">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => (setDraft(null), router.replace("/admin/pages"))}>
              <ArrowLeft className="size-3.5" aria-hidden /> All pages
            </Button>
            {draft.id && draft.isPublished && (
              <Button href={`/${draft.slug}`} target="_blank" variant="ghost" size="sm">
                View <ExternalLink className="size-3" aria-hidden />
              </Button>
            )}
          </div>
          <Panel className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Title" htmlFor="pg-title" required>
                <Input id="pg-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="Web address" htmlFor="pg-slug" hint={`gnananetra.co.in/${draft.slug || "…"}`}>
                <Input id="pg-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
              </Field>
            </div>
            <RichText value={draft.contentHtml} onChange={(html) => setDraft({ ...draft, contentHtml: html })} minHeight={360} />
            <Field label="Description for Google" htmlFor="pg-seo" hint="Optional, about 150 characters">
              <Textarea id="pg-seo" value={draft.seoDescription ?? ""} onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value || null })} className="min-h-[60px]" />
            </Field>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-[13.5px]">
                <Switch checked={draft.isPublished} onCheckedChange={(v) => setDraft({ ...draft, isPublished: v })} /> Published
              </label>
              <label className="flex items-center gap-2 text-[13.5px]">
                <Switch checked={draft.showInFooter} onCheckedChange={(v) => setDraft({ ...draft, showInFooter: v })} /> Link in footer
              </label>
              <label className="flex items-center gap-2 text-[13.5px]">
                Footer order
                <Input inputMode="numeric" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="h-8 w-16" />
              </label>
            </div>
          </Panel>
        </PageBody>
        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          {draft.id && (
            <Button
              variant="danger"
              size="md"
              className="mr-auto"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Delete “${draft.title}”? Links to it will stop working.`)) return;
                const r = await run(() => deletePage(draft.id!));
                if (r.ok) (setDraft(null), router.replace("/admin/pages"));
              }}
            >
              Delete page
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            disabled={busy || !draft.title}
            onClick={async () => {
              const r = await run(() => savePage({ ...draft, slug: draft.slug || undefined }));
              if (r.ok && r.data && !draft.id) setDraft({ ...draft, id: (r.data as { id: number }).id });
            }}
          >
            {busy ? "Saving…" : "Save page"}
          </Button>
        </div>
        {toastNode}
      </>
    );
  }

  const columns: Column<Row>[] = [
    {
      key: "title",
      header: "Page",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <FileText className="size-3.5 text-subtle" aria-hidden />
          <span className="font-medium">{r.title}</span>
        </span>
      ),
    },
    { key: "slug", header: "Address", cell: (r) => <span className="caption-style font-mono text-subtle">/{r.slug}</span> },
    { key: "footer", header: "Footer", cell: (r) => (r.showInFooter ? "linked" : "-") },
    { key: "updated", header: "Updated", cell: (r) => <span className="caption-style text-subtle">{formatDate(r.updatedAt)}</span> },
    { key: "status", header: "Status", cell: (r) => <ActiveTag active={r.isPublished} on="published" off="draft" /> },
  ];

  return (
    <>
      <PageHeader title="Pages" />
      <Toolbar
        actions={
          <Button variant="primary" size="sm" onClick={() => setDraft({ slug: "", title: "", contentHtml: "", seoDescription: null, isPublished: true, showInFooter: true, sort: rows.length + 1 })}>
            <Plus className="size-3.5" aria-hidden /> New page
          </Button>
        }
      >
        <p className="caption-style text-subtle">About, policies, FAQs and any other page. Product and category pages are managed under Products.</p>
      </Toolbar>
      <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} onRowClick={(r) => setDraft({ ...r })} />
      {toastNode}
    </>
  );
}
