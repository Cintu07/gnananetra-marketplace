"use client";

import { useState } from "react";
import { Image as ImageIcon, Plus, ExternalLink } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
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
import { deleteBanner, saveBanner } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/cn";

type Row = {
  id: number;
  placement: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  image: string | null;
  theme: string;
  sort: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};
type Draft = Omit<Row, "id"> & { id?: number };

const THEME_BG: Record<string, string> = { dark: "bg-[#0b1324] text-white", brand: "bg-[#c9420c] text-white", light: "bg-[#fff6f0] text-[#0b1220]" };
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function Preview({ b }: { b: Draft }) {
  return (
    <div className={cn("relative flex min-h-[140px] items-center gap-4 overflow-hidden rounded-xl p-5", THEME_BG[b.theme] ?? THEME_BG.dark)}>
      <div className="min-w-0 flex-1">
        {b.eyebrow && <p className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">{b.eyebrow}</p>}
        <p className="mt-1 text-[18px] leading-tight font-bold">{b.title || "Headline"}</p>
        {b.subtitle && <p className="mt-1.5 line-clamp-2 text-[12px] opacity-80">{b.subtitle}</p>}
        {b.ctaLabel && <span className="mt-3 inline-block rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#0b1220]">{b.ctaLabel} →</span>}
      </div>
      {b.image && (
        <span className="size-[96px] shrink-0 overflow-hidden rounded-xl bg-white p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image} alt="" className="size-full object-contain" />
        </span>
      )}
    </div>
  );
}

export default function BannersView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);
  const blank = (placement: string): Draft => ({ placement, eyebrow: null, title: "", subtitle: null, ctaLabel: "Shop now", ctaHref: "/shop", image: null, theme: placement === "hero" ? "dark" : "light", sort: rows.filter((r) => r.placement === placement).length + 1, isActive: true, startsAt: null, endsAt: null });

  const section = (placement: string, title: string, hint: string) => {
    const list = rows.filter((r) => r.placement === placement);
    return (
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[14px]">{title}</h2>
            <p className="caption-style text-subtle">{hint}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDraft(blank(placement))}>
            <Plus className="size-3.5" aria-hidden /> Add
          </Button>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => setDraft({ ...b })} className="block w-full text-left">
                <Preview b={b} />
              </button>
              <div className="mt-2 flex items-center gap-2">
                <ActiveTag active={b.isActive} on="showing" off="hidden" />
                <span className="caption-style text-subtle">position {b.sort}</span>
                {b.ctaHref && <span className="caption-style truncate text-subtle">→ {b.ctaHref}</span>}
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="caption-style text-subtle">None yet.</li>}
        </ul>
      </Panel>
    );
  };

  return (
    <>
      <PageHeader title="Homepage banners" />
      <Toolbar
        actions={
          <Button href="/" target="_blank" variant="ghost" size="sm">
            View homepage <ExternalLink className="size-3" aria-hidden />
          </Button>
        }
      >
        <p className="caption-style text-subtle">Changes go live as soon as you save.</p>
      </Toolbar>
      <PageBody>
        {section("hero", "Main slider", "The big rotating slides at the top of the homepage. 2 to 4 work best.")}
        {section("promo", "Side tiles", "The two smaller tiles next to the slider.")}
      </PageBody>
      <DetailSheet
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        icon={<ImageIcon />}
        title={draft?.id ? "Edit banner" : "New banner"}
        description="Banner"
        footer={
          draft && (
            <>
              {draft.id && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm("Delete this banner?")) return;
                    const r = await run(() => deleteBanner(draft.id!));
                    if (r.ok) setDraft(null);
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !draft.title}
                onClick={async () => {
                  const r = await run(() => saveBanner(draft as Parameters<typeof saveBanner>[0]));
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
          <>
            <DetailSection title="Preview">
              <Preview b={draft} />
            </DetailSection>
            <DetailSection title="Content" className="shadow-none">
              <Field label="Small label above" htmlFor="bn-eyebrow">
                <Input id="bn-eyebrow" value={draft.eyebrow ?? ""} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value || null })} placeholder="e.g. Diwali sale" />
              </Field>
              <Field label="Headline" htmlFor="bn-title" required>
                <Input id="bn-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="Supporting line" htmlFor="bn-sub">
                <Textarea id="bn-sub" value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value || null })} className="min-h-[64px]" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Button text" htmlFor="bn-cta">
                  <Input id="bn-cta" value={draft.ctaLabel ?? ""} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value || null })} />
                </Field>
                <Field label="Button link" htmlFor="bn-href" hint="/category/printer, /deals…">
                  <Input id="bn-href" value={draft.ctaHref ?? ""} onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value || null })} />
                </Field>
              </div>
              <Field label="Picture" htmlFor="bn-img" hint="A product on a white background looks best.">
                <ImageUploader value={draft.image} nameHint="banner" onUploaded={(url) => setDraft({ ...draft, image: url })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Colour" htmlFor="bn-theme">
                  <Select value={draft.theme} onValueChange={(v) => setDraft({ ...draft, theme: v })}>
                    <SelectTrigger id="bn-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Night blue</SelectItem>
                      <SelectItem value="brand">Saffron</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Position" htmlFor="bn-sort">
                  <Input id="bn-sort" inputMode="numeric" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                </Field>
                <Field label="Show from" htmlFor="bn-start" hint="Optional">
                  <Input id="bn-start" type="datetime-local" value={local(draft.startsAt)} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </Field>
                <Field label="Hide after" htmlFor="bn-end" hint="Optional">
                  <Input id="bn-end" type="datetime-local" value={local(draft.endsAt)} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </Field>
              </div>
              <label className="flex items-center justify-between text-[13.5px]">
                Showing
                <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
              </label>
            </DetailSection>
          </>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
