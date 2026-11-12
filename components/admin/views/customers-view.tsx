"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound, Mail, Phone, MessageCircle } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { TableFooter, type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection, KeyValue } from "@/components/admin/panel";
import FilterMenu from "@/components/admin/filter-menu";
import Avatar from "@/components/admin/avatar";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input, Textarea } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import Tag from "@/components/admin/ui/tag";
import { OrderStatusTag } from "@/components/admin/status-tag";
import { useRun } from "@/components/admin/use-run";
import ExportMenu from "@/components/admin/export-menu";
import { downloadPdf, pdfRupees } from "@/lib/pdf-export";
import { adminFetch } from "@/lib/admin-fetch";
import { updateCustomer } from "@/app/(admin)/admin/actions";
import { rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
  tags: string[];
  isBlocked: boolean;
  hasPassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
  city: string | null;
};

type Detail = {
  orders: { id: number; number: string; status: string; total: number; createdAt: string; paymentMethod: string }[];
  addresses: { id: number; name: string; line1: string; line2: string | null; city: string; state: string; pincode: string; phone: string | null; gstin: string | null; company: string | null }[];
};

const VIEWS: Record<string, { label: string; match: (r: Row) => boolean }> = {
  all: { label: "All", match: () => true },
  buyers: { label: "Buyers", match: (r) => r.spent > 0 },
  accounts: { label: "With account", match: (r) => r.hasPassword },
  guests: { label: "Guests", match: (r) => !r.hasPassword },
  blocked: { label: "Blocked", match: (r) => r.isBlocked },
};

const SOURCE: Record<string, string> = {
  signup: "Signed up",
  checkout: "Guest checkout",
  admin: "Added by admin",
  "wordpress-account": "Old site account",
  "wordpress-guest-order": "Old site guest",
};

export default function CustomersView({ rows, openId }: { rows: Row[]; openId: number | null }) {
  const { run, busy, toastNode } = useRun();
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [open, setOpen] = useState<Row | null>(rows.find((r) => r.id === openId) ?? null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) return;
    setDetail(null);
    setNotes(open.notes ?? "");
    setTags(open.tags.join(", "));
    adminFetch<Detail>(`/api/admin/customers/${open.id}`).then((r) => r.data && setDetail(r.data));
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => VIEWS[view].match(r) && (!needle || [r.name, r.email, r.phone, r.city, ...r.tags].some((v) => v?.toLowerCase().includes(needle))));
    const by: Record<string, (a: Row, b: Row) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      spent: (a, b) => b.spent - a.spent,
      orders: (a, b) => b.orders - a.orders,
      recent: (a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""),
    };
    return [...list].sort(by[sort]);
  }, [rows, view, q, sort]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (r) => (
        <span className="flex max-w-[280px] items-center gap-2.5">
          <Avatar name={r.name || r.email} className="size-7 text-[11px]" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-medium">{r.name || "No name"}</span>
            <span className="caption-style truncate text-subtle">{r.email ?? r.phone}</span>
          </span>
        </span>
      ),
    },
    { key: "phone", header: "Phone", cell: (r) => <span className="text-soft">{r.phone ?? "-"}</span> },
    { key: "city", header: "City", cell: (r) => <span className="text-soft">{r.city ?? "-"}</span> },
    { key: "orders", header: "Orders", align: "right", cell: (r) => r.orders },
    { key: "spent", header: "Spent", align: "right", cell: (r) => <span className="font-medium">{r.spent ? rupees(r.spent) : "-"}</span> },
    { key: "last", header: "Last order", cell: (r) => <span className="caption-style text-subtle">{r.lastOrderAt ? formatDate(r.lastOrderAt) : "never"}</span> },
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <span className="flex gap-1">
          {r.isBlocked ? <Tag tone="red">blocked</Tag> : r.hasPassword ? <Tag tone="blue">account</Tag> : <Tag tone="neutral">guest</Tag>}
          {r.tags.slice(0, 2).map((t) => (
            <Tag key={t} tone="amber">
              {t}
            </Tag>
          ))}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Customers" tabs={Object.entries(VIEWS).map(([value, v]) => ({ value, label: v.label, count: rows.filter(v.match).length }))} tab={view} onTab={setView} />
      <Toolbar
        actions={
          <ExportMenu
            variant="secondary"
            csvHref="/api/admin/export/customers"
            csvLabel={`All ${rows.length} customers with notes and tags`}
            pdfLabel={`This list: ${filtered.length} customer${filtered.length === 1 ? "" : "s"}`}
            onPdf={() =>
              downloadPdf({
                title: "Customers",
                subtitle: [VIEWS[view].label, q && `"${q}"`, `${filtered.length} customers`].filter(Boolean).join(" · "),
                filename: `gnananetra-customers-${new Date().toISOString().slice(0, 10)}.pdf`,
                rows: filtered,
                columns: [
                  { header: "Name", value: (r) => r.name || "", width: 140 },
                  { header: "Email", value: (r) => r.email ?? "", width: 170 },
                  { header: "Phone", value: (r) => r.phone ?? "" },
                  { header: "City", value: (r) => r.city ?? "" },
                  { header: "Orders", value: (r) => r.orders, align: "right" },
                  { header: "Spent", value: (r) => (r.spent ? pdfRupees(r.spent) : ""), align: "right" },
                  { header: "Last order", value: (r) => (r.lastOrderAt ? formatDate(r.lastOrderAt) : "") },
                  { header: "Since", value: (r) => formatDate(r.createdAt) },
                  { header: "Type", value: (r) => (r.isBlocked ? "blocked" : r.hasPassword ? "account" : "guest") },
                ],
                totals: [`${filtered.length} customers`, "", "", "", filtered.reduce((n, r) => n + r.orders, 0), pdfRupees(filtered.reduce((n, r) => n + r.spent, 0)), "", "", ""],
              })
            }
          />
        }
      >
        <div className="relative w-full sm:w-[260px]">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone, city, tag" className="h-9 pl-8 text-[14px] sm:h-[30px] sm:text-[13px]" />
        </div>
        <FilterMenu
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "spent", label: "Top spenders" },
            { value: "orders", label: "Most orders" },
            { value: "recent", label: "Recently ordered" },
          ]}
        />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => String(r.id)}
        onRowClick={setOpen}
        activeKey={open ? String(open.id) : null}
        emptyLabel="No customers match."
        footer={<TableFooter items={[{ label: "customers", value: filtered.length }, { label: "lifetime sales", value: rupees(filtered.reduce((n, r) => n + r.spent, 0)) }]} />}
      />

      <DetailSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        icon={<UserRound />}
        title={open?.name || open?.email || "Customer"}
        description="Customer details"
        footer={
          open && (
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(() =>
                  updateCustomer(open.id, {
                    notes: notes || null,
                    tags: tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }),
                )
              }
            >
              Save notes and tags
            </Button>
          )
        }
      >
        {open && (
          <>
            <DetailSection title="Contact">
              <div className="flex flex-col gap-2 text-[13.5px]">
                {open.email && (
                  <a href={`mailto:${open.email}`} className="flex items-center gap-2 hover:underline">
                    <Mail className="size-3.5 text-subtle" aria-hidden /> {open.email}
                  </a>
                )}
                {open.phone && (
                  <span className="flex items-center gap-3">
                    <a href={`tel:${open.phone}`} className="flex items-center gap-2 hover:underline">
                      <Phone className="size-3.5 text-subtle" aria-hidden /> {open.phone}
                    </a>
                    <a href={`https://wa.me/${open.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noopener" className="caption-style flex items-center gap-1 text-primary hover:underline">
                      <MessageCircle className="size-3" aria-hidden /> WhatsApp
                    </a>
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <KeyValue label="Customer since">{formatDate(open.createdAt)}</KeyValue>
                <KeyValue label="Came from">{SOURCE[open.source] ?? open.source}</KeyValue>
                <KeyValue label="Account">{open.hasPassword ? `Yes${open.lastLoginAt ? `, last sign-in ${formatDate(open.lastLoginAt)}` : ""}` : "Guest (no password)"}</KeyValue>
                <KeyValue label="Orders">{open.orders}</KeyValue>
                <KeyValue label="Lifetime value" strong>
                  {rupees(open.spent)}
                </KeyValue>
              </div>
            </DetailSection>
            <DetailSection title={`Orders (${detail?.orders.length ?? open.orders})`}>
              {!detail ? (
                <p className="caption-style text-subtle">Loading…</p>
              ) : detail.orders.length === 0 ? (
                <p className="caption-style text-subtle">No orders yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {detail.orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2 hover:bg-muted/60">
                        <span className="font-mono text-[12.5px]">{o.number}</span>
                        <span className="caption-style flex-1 text-subtle">{formatDate(o.createdAt)}</span>
                        <OrderStatusTag status={o.status} />
                        <span className="w-20 text-right text-[13px] tabular-nums">{rupees(o.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
            {detail && detail.addresses.length > 0 && (
              <DetailSection title="Addresses">
                {detail.addresses.map((a) => (
                  <p key={a.id} className="text-[13px] leading-relaxed text-soft">
                    <span className="font-medium text-foreground">{a.name}</span>
                    {a.company && ` · ${a.company}`}
                    <br />
                    {a.line1}
                    {a.line2 && `, ${a.line2}`}, {a.city}, {a.state} {a.pincode}
                    {a.gstin && (
                      <>
                        <br />
                        GSTIN {a.gstin}
                      </>
                    )}
                  </p>
                ))}
              </DetailSection>
            )}
            <DetailSection title="Notes for your team">
              <Field label="Tags" htmlFor="cu-tags" hint="Comma separated, e.g. school, repeat buyer, VIP">
                <Input id="cu-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
              </Field>
              <Field label="Private notes" htmlFor="cu-notes">
                <Textarea id="cu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, credit terms, who to contact…" />
              </Field>
            </DetailSection>
            <DetailSection title="Access" className="shadow-none">
              <label className="flex items-center justify-between text-[13.5px]">
                <span>
                  Block this customer
                  <span className="caption-style mt-1 block text-subtle">They can&apos;t sign in. Use for fraud or abuse.</span>
                </span>
                <Switch
                  checked={open.isBlocked}
                  disabled={busy}
                  onCheckedChange={async (v) => {
                    const r = await run(() => updateCustomer(open.id, { isBlocked: v }));
                    if (r.ok) setOpen({ ...open, isBlocked: v });
                  }}
                />
              </label>
            </DetailSection>
          </>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
