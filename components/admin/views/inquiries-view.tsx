"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Mail, Phone, MessageCircle } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import DataTable, { type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection, KeyValue } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Textarea } from "@/components/admin/ui/input";
import Tag from "@/components/admin/ui/tag";
import { InquiryStatusTag } from "@/components/admin/status-tag";
import { useRun } from "@/components/admin/use-run";
import { updateInquiry } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  quantity: number | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  productName: string | null;
  productId: number | null;
};

const TABS: Record<string, (r: Row) => boolean> = {
  open: (r) => r.status === "new" || r.status === "in_progress",
  bulk: (r) => r.kind === "bulk_quote",
  resolved: (r) => r.status === "resolved",
  spam: (r) => r.status === "spam",
  all: () => true,
};
const LABEL: Record<string, string> = { open: "Open", bulk: "Bulk quotes", resolved: "Resolved", spam: "Spam", all: "All" };

export default function InquiriesView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [tab, setTab] = useState("open");
  const [open, setOpen] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => setNote(open?.adminNote ?? ""), [open]);

  const list = rows.filter(TABS[tab]);
  const columns: Column<Row>[] = [
    {
      key: "who",
      header: "From",
      cell: (r) => (
        <span className="flex max-w-[240px] flex-col gap-1">
          <span className={`truncate ${r.status === "new" ? "font-semibold" : ""}`}>{r.name}</span>
          <span className="caption-style truncate text-subtle">{r.company ?? r.phone ?? r.email}</span>
        </span>
      ),
    },
    {
      key: "about",
      header: "About",
      cell: (r) => (
        <span className="flex max-w-[380px] items-center gap-2">
          {r.kind === "bulk_quote" && <Tag tone="orange">bulk{r.quantity ? ` ×${r.quantity}` : ""}</Tag>}
          <span className="truncate text-soft">{r.subject || r.productName || r.message}</span>
        </span>
      ),
    },
    { key: "date", header: "Received", cell: (r) => <span className="caption-style text-subtle">{formatDate(r.createdAt, true)}</span> },
    { key: "status", header: "Status", cell: (r) => <InquiryStatusTag status={r.status} /> },
  ];

  const setStatus = async (status: string) => {
    if (!open) return;
    const r = await run(() => updateInquiry(open.id, { status, adminNote: note || null }));
    if (r.ok) setOpen(null);
  };

  return (
    <>
      <PageHeader title="Inquiries" tabs={Object.keys(TABS).map((k) => ({ value: k, label: LABEL[k], count: rows.filter(TABS[k]).length }))} tab={tab} onTab={setTab} />
      <DataTable
        columns={columns}
        rows={list}
        rowKey={(r) => String(r.id)}
        onRowClick={(r) => {
          setOpen(r);
          if (r.status === "new") updateInquiry(r.id, { status: "in_progress" });
        }}
        activeKey={open ? String(open.id) : null}
        emptyLabel="Nothing here. Contact form messages and bulk quote requests land in this inbox."
      />
      <DetailSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        icon={<MessageSquare />}
        title={open ? `${open.kind === "bulk_quote" ? "Bulk quote" : "Message"} from ${open.name}` : ""}
        description="Inquiry"
        footer={
          open && (
            <>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setStatus("spam")}>
                Spam
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("in_progress")}>
                Save note
              </Button>
              <Button variant="primary" size="sm" disabled={busy} onClick={() => setStatus("resolved")}>
                Mark resolved
              </Button>
            </>
          )
        }
      >
        {open && (
          <>
            <DetailSection title="Contact">
              <div className="flex flex-col gap-2 text-[13.5px]">
                <span className="font-medium">
                  {open.name}
                  {open.company && <span className="font-normal text-soft"> · {open.company}</span>}
                </span>
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
                {open.email && (
                  <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject ?? "your enquiry"}`)}`} className="flex items-center gap-2 hover:underline">
                    <Mail className="size-3.5 text-subtle" aria-hidden /> {open.email}
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <KeyValue label="Received">{formatDate(open.createdAt, true)}</KeyValue>
                {open.productName && <KeyValue label="Product">{open.productName}</KeyValue>}
                {open.quantity && <KeyValue label="Quantity">{open.quantity}</KeyValue>}
              </div>
            </DetailSection>
            <DetailSection title={open.subject || "Message"}>
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{open.message}</p>
            </DetailSection>
            <DetailSection title="Internal note" className="shadow-none">
              <Field label="Only your team sees this" htmlFor="inq-note">
                <Textarea id="inq-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called back, sent quote on WhatsApp…" />
              </Field>
            </DetailSection>
          </>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
