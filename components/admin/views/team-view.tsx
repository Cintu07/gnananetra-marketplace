"use client";

import { useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { type Column } from "@/components/admin/data-table";
import DetailSheet from "@/components/admin/detail-sheet";
import { DetailSection } from "@/components/admin/panel";
import Avatar from "@/components/admin/avatar";
import Button from "@/components/admin/ui/button";
import Field from "@/components/admin/ui/field";
import { Input } from "@/components/admin/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import Tag from "@/components/admin/ui/tag";
import { useRun } from "@/components/admin/use-run";
import { removeStaff, saveStaff } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/site";

type Row = { id: number; name: string; email: string | null; role: string; lastLoginAt: string | null; createdAt: string };
type Draft = { id?: number; name: string; email: string; role: "admin" | "staff"; password: string };

export default function TeamView({ rows, meId }: { rows: Row[]; meId: number }) {
  const { run, busy, toastNode } = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);

  const columns: Column<Row>[] = [
    {
      key: "who",
      header: "Person",
      cell: (r) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={r.name || r.email} className="size-7 text-[11px]" />
          <span className="flex flex-col gap-1">
            <span className="font-medium">
              {r.name}
              {r.id === meId && <span className="caption-style ml-1.5 text-subtle">(you)</span>}
            </span>
            <span className="caption-style text-subtle">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: "role", header: "Access", cell: (r) => <Tag tone={r.role === "admin" ? "orange" : "blue"}>{r.role === "admin" ? "owner" : "staff"}</Tag> },
    { key: "last", header: "Last sign-in", cell: (r) => <span className="caption-style text-subtle">{r.lastLoginAt ? formatDate(r.lastLoginAt, true) : "never"}</span> },
  ];

  return (
    <>
      <PageHeader title="Team" />
      <Toolbar
        actions={
          <Button variant="primary" size="sm" onClick={() => setDraft({ name: "", email: "", role: "staff", password: "" })}>
            <Plus className="size-3.5" aria-hidden /> Add person
          </Button>
        }
      >
        <p className="caption-style leading-snug text-subtle">Owners can do everything. Staff can run orders, products and customers, but can&apos;t change settings or the team.</p>
      </Toolbar>
      <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} onRowClick={(r) => setDraft({ id: r.id, name: r.name, email: r.email ?? "", role: r.role as "admin" | "staff", password: "" })} />
      <DetailSheet
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        icon={<ShieldCheck />}
        title={draft?.id ? `Edit · ${draft.name}` : "Add a team member"}
        description="Staff access"
        footer={
          draft && (
            <>
              {draft.id && draft.id !== meId && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Remove admin access for ${draft.email}? Their customer account stays.`)) return;
                    const r = await run(() => removeStaff(draft.id!));
                    if (r.ok) setDraft(null);
                  }}
                >
                  Remove access
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !draft.email || !draft.name}
                onClick={async () => {
                  const r = await run(() => saveStaff(draft));
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
            <Field label="Name" htmlFor="tm-name" required>
              <Input id="tm-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Email (used to sign in)" htmlFor="tm-email" required>
              <Input id="tm-email" type="email" value={draft.email} disabled={!!draft.id} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <Field label="Access" htmlFor="tm-role">
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as "admin" | "staff" })}>
                <SelectTrigger id="tm-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff · orders, products, customers</SelectItem>
                  <SelectItem value="admin">Owner · everything</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={draft.id ? "New password" : "Password"} htmlFor="tm-pass" hint={draft.id ? "Leave empty to keep the current one" : "At least 10 characters. Share it with them privately."}>
              <Input id="tm-pass" type="text" autoComplete="new-password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            </Field>
          </DetailSection>
        )}
      </DetailSheet>
      {toastNode}
    </>
  );
}
