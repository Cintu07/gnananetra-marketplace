"use client";

import { useEffect, useState } from "react";
import { Star, Check, X, ExternalLink, BadgeCheck } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import DataTable, { type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Textarea } from "@/components/admin/ui/input";
import Tag from "@/components/admin/ui/tag";
import { useRun } from "@/components/admin/use-run";
import { deleteReview, moderateReview } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  name: string;
  email: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  isVerified: boolean;
  adminReply: string | null;
  createdAt: string;
  productId: number;
  productName: string;
  productSlug: string;
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex" aria-label={`${n} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-3 ${i <= n ? "fill-[#D0A031] text-[#D0A031]" : "text-line-strong"}`} aria-hidden />
      ))}
    </span>
  );
}

export default function ReviewsView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const [tab, setTab] = useState("pending");
  const [open, setOpen] = useState<Row | null>(null);
  const [reply, setReply] = useState("");
  useEffect(() => setReply(open?.adminReply ?? ""), [open]);

  const list = rows.filter((r) => tab === "all" || r.status === tab);
  const columns: Column<Row>[] = [
    { key: "rating", header: "Rating", cell: (r) => <Stars n={r.rating} /> },
    {
      key: "review",
      header: "Review",
      cell: (r) => (
        <span className="flex max-w-[420px] flex-col gap-1">
          <span className="truncate">{r.title || r.body}</span>
          <span className="caption-style truncate text-subtle">on {r.productName}</span>
        </span>
      ),
    },
    {
      key: "by",
      header: "By",
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {r.name}
          {r.isVerified && <BadgeCheck className="size-3.5 text-success" aria-label="Verified purchase" />}
        </span>
      ),
    },
    { key: "date", header: "Date", cell: (r) => <span className="caption-style text-subtle">{formatDate(r.createdAt)}</span> },
    { key: "status", header: "Status", cell: (r) => <Tag tone={r.status === "approved" ? "green" : r.status === "pending" ? "amber" : "neutral"}>{r.status === "rejected" ? "hidden" : r.status}</Tag> },
    {
      key: "act",
      header: "",
      cell: (r) =>
        r.status === "pending" ? (
          <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon-sm" variant="secondary" aria-label="Approve" title="Approve" disabled={busy} onClick={() => run(() => moderateReview(r.id, "approved"))}>
              <Check className="size-3.5 text-success" aria-hidden />
            </Button>
            <Button size="icon-sm" variant="secondary" aria-label="Hide" title="Hide" disabled={busy} onClick={() => run(() => moderateReview(r.id, "rejected"))}>
              <X className="size-3.5 text-danger" aria-hidden />
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Reviews"
        tabs={[
          { value: "pending", label: "To check", count: rows.filter((r) => r.status === "pending").length },
          { value: "approved", label: "Published", count: rows.filter((r) => r.status === "approved").length },
          { value: "rejected", label: "Hidden", count: rows.filter((r) => r.status === "rejected").length },
          { value: "all", label: "All", count: rows.length },
        ]}
        tab={tab}
        onTab={setTab}
      />
      <DataTable columns={columns} rows={list} rowKey={(r) => String(r.id)} onRowClick={setOpen} activeKey={open ? String(open.id) : null} emptyLabel="No reviews here." />
      <DetailSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        icon={<Star />}
        title={open ? `Review by ${open.name}` : ""}
        description="Review"
        footer={
          open && (
            <>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("Delete this review for good?")) return;
                  const r = await run(() => deleteReview(open.id));
                  if (r.ok) setOpen(null);
                }}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  const r = await run(() => moderateReview(open.id, "rejected", reply));
                  if (r.ok) setOpen(null);
                }}
              >
                Hide
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  const r = await run(() => moderateReview(open.id, "approved", reply));
                  if (r.ok) setOpen(null);
                }}
              >
                {open.status === "approved" ? "Save reply" : "Approve and publish"}
              </Button>
            </>
          )
        }
      >
        {open && (
          <>
            <DetailSection
              title={open.productName}
              action={
                <Button href={`/product/${open.productSlug}`} target="_blank" variant="ghost" size="sm">
                  View <ExternalLink className="size-3" aria-hidden />
                </Button>
              }
            >
              <Stars n={open.rating} />
              {open.title && <p className="text-[15px] font-medium">{open.title}</p>}
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{open.body}</p>
              <p className="caption-style text-subtle">
                {open.name}
                {open.email && ` · ${open.email}`} · {formatDate(open.createdAt, true)}
                {open.isVerified && " · verified purchase"}
              </p>
            </DetailSection>
            <DetailSection title="Public reply" className="shadow-none">
              <Field label="Shown under the review on the product page" htmlFor="rv-reply">
                <Textarea id="rv-reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank you for your feedback…" />
              </Field>
            </DetailSection>
          </>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
