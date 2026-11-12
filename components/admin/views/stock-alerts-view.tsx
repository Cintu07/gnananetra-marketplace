"use client";

import Link from "next/link";
import { BellRing, Send, Trash2 } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import Button from "@/components/admin/ui/button";
import { StockTag } from "@/components/admin/status-tag";
import { useRun } from "@/components/admin/use-run";
import { deleteStockAlert, notifyStockAlerts } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/site";

type Row = { id: number; email: string; createdAt: string; productId: number; productName: string; productSlug: string; stockStatus: string; status: string };

export default function StockAlertsView({ rows }: { rows: Row[] }) {
  const { run, busy, toastNode } = useRun();
  const groups = new Map<number, Row[]>();
  for (const r of rows) groups.set(r.productId, [...(groups.get(r.productId) ?? []), r]);
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length);

  return (
    <>
      <PageHeader title="Stock alerts" chip={{ label: `${rows.length} waiting`, tone: rows.length ? "warn" : "muted" }} />
      <Toolbar>
        <p className="caption-style leading-snug text-subtle">Shoppers who asked to be emailed when an out-of-stock product returns. Marking a product in stock emails them automatically.</p>
      </Toolbar>
      <PageBody>
        {sorted.length === 0 ? (
          <Panel className="py-14 text-center">
            <BellRing className="mx-auto size-6 text-faint" aria-hidden />
            <p className="caption-style mt-3 text-subtle">Nobody is waiting right now.</p>
          </Panel>
        ) : (
          sorted.map((list) => {
            const p = list[0];
            const ready = p.stockStatus !== "out_of_stock" && p.status === "published";
            return (
              <Panel key={p.productId} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Link href={`/admin/products/${p.productId}`} className="truncate text-[14px] font-medium hover:underline">
                      {p.productName}
                    </Link>
                    <span className="flex items-center gap-2">
                      <StockTag status={p.stockStatus} qty={null} />
                      <span className="caption-style text-subtle">{list.length} waiting</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button href={`/admin/products/${p.productId}`} variant="secondary" size="sm">
                      Update stock
                    </Button>
                    <Button variant="primary" size="sm" disabled={busy || !ready} title={ready ? undefined : "Mark the product in stock first"} onClick={() => run(() => notifyStockAlerts(p.productId))}>
                      <Send className="size-3.5" aria-hidden /> Email them now
                    </Button>
                  </div>
                </div>
                <ul className="flex flex-col divide-y divide-border border-t border-border">
                  {list.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2 text-[13.5px]">
                      <a href={`mailto:${r.email}`} className="flex-1 truncate hover:underline">
                        {r.email}
                      </a>
                      <span className="caption-style text-subtle">{formatDate(r.createdAt)}</span>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${r.email}`} disabled={busy} onClick={() => run(() => deleteStockAlert(r.id))}>
                        <Trash2 className="size-3" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })
        )}
      </PageBody>
      {toastNode}
    </>
  );
}
