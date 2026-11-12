"use client";

import Link from "next/link";
import { useState } from "react";
import { Store } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import Tag from "@/components/admin/ui/tag";
import { Input } from "@/components/admin/ui/input";
import { useRun } from "@/components/admin/use-run";
import { recordPayout, setSellerCommission, setSellerStatus } from "@/app/(admin)/admin/sellers-actions";
import { rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  storeName: string;
  slug: string;
  owner: string;
  email: string | null;
  phone: string | null;
  city: string;
  gstin: string | null;
  about: string | null;
  pickupAddress: string | null;
  status: string;
  commissionPct: number | null;
  rejectionReason: string | null;
  createdAt: string;
  products: number;
  sold: number;
  balance: number;
  paid: number;
};

const TONE: Record<string, "amber" | "green" | "red" | "neutral"> = { pending: "amber", approved: "green", rejected: "red", suspended: "red" };
const LABEL: Record<string, string> = { pending: "Waiting for approval", approved: "Approved", rejected: "Rejected", suspended: "Suspended" };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
];

export default function SellersView({ rows, defaultPct, isOwner }: { rows: Row[]; defaultPct: number; isOwner: boolean }) {
  const { run, busy, toastNode } = useRun();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [pct, setPct] = useState("");
  const [pay, setPay] = useState({ amount: "", ref: "", note: "" });
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const waiting = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader title="Sellers" chip={{ label: waiting ? `${waiting} waiting for approval` : `${rows.length} sellers`, tone: waiting ? "warn" : "muted" }} />
      <Toolbar>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {FILTERS.map((f) => (
            <Button key={f.key} variant={filter === f.key ? "primary" : "secondary"} size="sm" onClick={() => setFilter(f.key)} role="tab" aria-selected={filter === f.key}>
              {f.label} {f.key === "all" ? rows.length : rows.filter((r) => r.status === f.key).length}
            </Button>
          ))}
        </div>
      </Toolbar>
      <PageBody>
        {shown.length === 0 ? (
          <Panel className="py-14 text-center">
            <Store className="mx-auto size-6 text-faint" aria-hidden />
            <p className="caption-style mt-3 text-subtle">No sellers here yet.</p>
          </Panel>
        ) : (
          shown.map((r) => {
            const isOpen = open === r.id;
            return (
              <Panel key={r.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                      {r.storeName}
                      <Tag tone={TONE[r.status] ?? "neutral"}>{LABEL[r.status] ?? r.status}</Tag>
                    </p>
                    <p className="caption-style mt-1 text-subtle">
                      {r.owner} · {r.email} · {r.phone} · {r.city}
                    </p>
                    <p className="caption-style text-subtle">Applied {formatDate(r.createdAt)} · {r.products} product{r.products === 1 ? "" : "s"} · sold {rupees(r.sold)} · payable now {rupees(r.balance)} · commission {r.commissionPct ?? defaultPct}%{r.commissionPct === null ? " (default)" : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "approved" && r.status !== "rejected" && (
                      <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => setSellerStatus(r.id, "approved"))}>Approve</Button>
                    )}
                    {r.status === "rejected" && (
                      <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => setSellerStatus(r.id, "approved"))}>Approve after all</Button>
                    )}
                    {r.status === "approved" && (
                      <Button variant="danger" size="sm" disabled={busy} onClick={() => confirm(`Suspend ${r.storeName}? Their products are hidden at once.`) && run(() => setSellerStatus(r.id, "suspended", reason || "Suspended by the team"))}>Suspend</Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setOpen(isOpen ? null : r.id)}>{isOpen ? "Close" : "Details"}</Button>
                    {r.status === "approved" && <Button href={`/store/${r.slug}`} variant="ghost" size="sm" target="_blank">Store page</Button>}
                  </div>
                </div>

                {isOpen && (
                  <div className="grid gap-4 border-t border-border pt-4 lg:grid-cols-3">
                    <div className="space-y-1 text-[13px] leading-relaxed">
                      <p className="font-medium">About them</p>
                      <p className="text-subtle">{r.about || "Nothing written."}</p>
                      <p className="text-subtle">GSTIN: {r.gstin || "not given"}</p>
                      <p className="text-subtle">Pickup: {r.pickupAddress || "not given"}</p>
                      <p><Link href={`/admin/products?q=`} className="underline">All products</Link></p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[13px] font-medium">Decision</p>
                      <Input aria-label="Reason (shown to the seller)" placeholder="Reason, if rejecting or suspending" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button variant="danger" size="sm" disabled={busy || r.status === "rejected"} onClick={() => run(() => setSellerStatus(r.id, "rejected", reason))}>Reject application</Button>
                      {isOwner && (
                        <>
                          <p className="pt-2 text-[13px] font-medium">Commission (new orders only)</p>
                          <div className="flex gap-2">
                            <Input aria-label="Commission percent" inputMode="numeric" className="w-24" placeholder={String(defaultPct)} value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                            <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => setSellerCommission(r.id, pct === "" ? null : Number(pct)))}>{pct === "" ? "Use default" : "Set"}</Button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[13px] font-medium">Record a payout</p>
                      {isOwner ? (
                        <>
                          <p className="caption-style text-subtle">Payable now: {rupees(r.balance)}. Paid so far: {rupees(r.paid)}. Transfer the money to their bank first, then record it here.</p>
                          <Input aria-label="Amount in rupees" inputMode="decimal" placeholder="Amount (₹)" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value.replace(/[^\d.]/g, "") })} />
                          <Input aria-label="Bank reference" placeholder="Bank reference (UTR)" value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} />
                          <Input aria-label="Note" placeholder="Note (optional)" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
                          <Button variant="primary" size="sm" disabled={busy || !pay.amount} onClick={() => run(() => recordPayout(r.id, Number(pay.amount), pay.ref, pay.note)).then((x) => x.ok && setPay({ amount: "", ref: "", note: "" }))}>Record payout</Button>
                        </>
                      ) : (
                        <p className="caption-style text-subtle">Only the owner account can record payouts.</p>
                      )}
                    </div>
                  </div>
                )}
                {r.status === "rejected" && r.rejectionReason && <p className="caption-style text-subtle">Reason given: {r.rejectionReason}</p>}
              </Panel>
            );
          })
        )}
      </PageBody>
      {toastNode}
    </>
  );
}
