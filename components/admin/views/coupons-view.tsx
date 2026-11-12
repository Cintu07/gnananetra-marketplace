"use client";

import { useState } from "react";
import { Ticket, Plus } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import Tag from "@/components/admin/ui/tag";
import { RupeeInput } from "@/components/admin/rupee-input";
import { useRun } from "@/components/admin/use-run";
import { deleteCoupon, saveCoupon } from "@/app/(admin)/admin/actions";
import { rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};
type Draft = Omit<Row, "id" | "usedCount"> & { id?: number };

const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function state(r: Row) {
  const now = Date.now();
  if (!r.isActive) return <Tag tone="neutral">off</Tag>;
  if (r.endsAt && new Date(r.endsAt).getTime() < now) return <Tag tone="neutral">expired</Tag>;
  if (r.startsAt && new Date(r.startsAt).getTime() > now) return <Tag tone="purple">scheduled</Tag>;
  if (r.usageLimit !== null && r.usedCount >= r.usageLimit) return <Tag tone="amber">used up</Tag>;
  return <Tag tone="green">active</Tag>;
}

export default function CouponsView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);

  const columns: Column<Row>[] = [
    { key: "code", header: "Code", cell: (r) => <span className="font-mono font-medium">{r.code}</span> },
    { key: "offer", header: "Offer", cell: (r) => (r.type === "percent" ? `${r.value}% off${r.maxDiscount ? ` (up to ${rupees(r.maxDiscount)})` : ""}` : `${rupees(r.value)} off`) },
    { key: "min", header: "Min. order", align: "right", cell: (r) => (r.minSubtotal ? rupees(r.minSubtotal) : "-") },
    { key: "used", header: "Used", align: "right", cell: (r) => `${r.usedCount}${r.usageLimit ? ` / ${r.usageLimit}` : ""}` },
    { key: "ends", header: "Ends", cell: (r) => <span className="caption-style text-subtle">{r.endsAt ? formatDate(r.endsAt) : "never"}</span> },
    { key: "state", header: "State", cell: state },
  ];

  return (
    <>
      <PageHeader title="Coupons" chip={{ label: `${rows.filter((r) => r.isActive).length} active`, tone: "muted" }} />
      <Toolbar
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setDraft({ code: "", description: null, type: "percent", value: 10, minSubtotal: 0, maxDiscount: null, startsAt: null, endsAt: null, usageLimit: null, isActive: true })}
          >
            <Plus className="size-3.5" aria-hidden /> New coupon
          </Button>
        }
      >
        <p className="caption-style text-subtle">Shoppers type the code at checkout. The discount comes off the subtotal.</p>
      </Toolbar>
      <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} onRowClick={(r) => setDraft({ ...r })} emptyLabel="No coupons yet. Create one for a festival sale or a big customer." />
      <DetailSheet
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        icon={<Ticket />}
        title={draft?.id ? `Coupon ${draft.code}` : "New coupon"}
        description="Coupon settings"
        footer={
          draft && (
            <>
              {draft.id && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Delete coupon ${draft.code}?`)) return;
                    const r = await run(() => deleteCoupon(draft.id!));
                    if (r.ok) setDraft(null);
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !draft.code}
                onClick={async () => {
                  const r = await run(() => saveCoupon({ ...draft, type: draft.type === "flat" ? "flat" : "percent" }));
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
          <DetailSection title="Offer" className="shadow-none">
            <Field label="Code" htmlFor="cp-code" required hint="Letters and numbers, e.g. DIWALI10">
              <Input id="cp-code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} className="font-mono uppercase" />
            </Field>
            <Field label="Message shown when applied" htmlFor="cp-desc">
              <Input id="cp-desc" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value || null })} placeholder="Diwali offer applied" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="cp-type">
                <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v, value: v === "percent" ? 10 : 50000 })}>
                  <SelectTrigger id="cp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="flat">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={draft.type === "percent" ? "Percent" : "Amount"} htmlFor="cp-val" required>
                {draft.type === "percent" ? (
                  <Input id="cp-val" inputMode="numeric" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 0) })} />
                ) : (
                  <RupeeInput id="cp-val" valuePaise={draft.value} onChange={(v) => setDraft({ ...draft, value: v })} />
                )}
              </Field>
              <Field label="Minimum order" htmlFor="cp-min">
                <RupeeInput id="cp-min" valuePaise={draft.minSubtotal} onChange={(v) => setDraft({ ...draft, minSubtotal: v })} />
              </Field>
              {draft.type === "percent" && (
                <Field label="Maximum discount" htmlFor="cp-max" hint="Optional cap">
                  <RupeeInput id="cp-max" valuePaise={draft.maxDiscount ?? 0} onChange={(v) => setDraft({ ...draft, maxDiscount: v || null })} />
                </Field>
              )}
              <Field label="Starts" htmlFor="cp-start">
                <Input id="cp-start" type="datetime-local" value={local(draft.startsAt)} onChange={(e) => setDraft({ ...draft, startsAt: fromLocal(e.target.value) })} />
              </Field>
              <Field label="Ends" htmlFor="cp-end">
                <Input id="cp-end" type="datetime-local" value={local(draft.endsAt)} onChange={(e) => setDraft({ ...draft, endsAt: fromLocal(e.target.value) })} />
              </Field>
              <Field label="Total uses allowed" htmlFor="cp-limit" hint="Empty = unlimited">
                <Input id="cp-limit" inputMode="numeric" value={draft.usageLimit ?? ""} onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} />
              </Field>
            </div>
            <label className="flex items-center justify-between text-[13.5px]">
              Active
              <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
            </label>
          </DetailSection>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
