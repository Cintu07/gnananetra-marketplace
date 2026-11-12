"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import PageHeader, { Toolbar } from "@/components/admin/page-header";
import DataTable, { TableFooter, type Column } from "@/components/admin/data-table";
import FilterMenu from "@/components/admin/filter-menu";
import Button from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import Tag from "@/components/admin/ui/tag";
import { OrderStatusTag, PaymentTag } from "@/components/admin/status-tag";
import ExportMenu from "@/components/admin/export-menu";
import { downloadPdf, pdfRupees } from "@/lib/pdf-export";
import { ORDER_STATUS_LABEL } from "@/lib/site";
import { rupees } from "@/lib/money";
import { formatDate } from "@/lib/site";

type Row = {
  id: number;
  number: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  source: string;
  city: string | null;
  createdAt: string;
  items: number;
};

const VIEWS: Record<string, { label: string; match: (r: Row) => boolean }> = {
  all: { label: "All", match: () => true },
  "to-ship": { label: "To ship", match: (r) => r.status === "processing" || r.status === "packed" },
  pending: { label: "Awaiting payment", match: (r) => r.status === "pending" },
  shipped: { label: "Shipped", match: (r) => r.status === "shipped" },
  delivered: { label: "Delivered", match: (r) => r.status === "delivered" },
  closed: { label: "Cancelled / failed", match: (r) => ["cancelled", "failed", "refunded"].includes(r.status) },
};

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function OrdersView({ rows, initialView, initialQuery }: { rows: Row[]; initialView: string; initialQuery: string }) {
  const router = useRouter();
  const [view, setView] = useState(VIEWS[initialView] ? initialView : "all");
  const [q, setQ] = useState(initialQuery);
  const [payment, setPayment] = useState("all");
  const [period, setPeriod] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const since = period === "all" ? 0 : Date.now() - Number(period) * 86400_000;
    return rows.filter(
      (r) =>
        VIEWS[view].match(r) &&
        (payment === "all" || r.paymentMethod === payment) &&
        (!since || new Date(r.createdAt).getTime() >= since) &&
        (!needle || [r.number, r.name, r.email, r.phone, r.city].some((v) => v?.toLowerCase().includes(needle))),
    );
  }, [rows, view, q, payment, period]);

  const tabs = Object.entries(VIEWS).map(([value, v]) => ({ value, label: v.label, count: rows.filter(v.match).length }));
  const revenue = filtered.filter((r) => !["cancelled", "failed", "pending", "refunded"].includes(r.status)).reduce((n, r) => n + r.total, 0);

  const columns: Column<Row>[] = [
    {
      key: "number",
      header: "Order",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-medium">{r.number}</span>
          {r.source === "wordpress" && (
            <Tag tone="neutral" size="sm">
              old site
            </Tag>
          )}
        </span>
      ),
    },
    { key: "date", header: "Date", cell: (r) => <span className="text-soft">{formatDate(r.createdAt, true)}</span> },
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <span className="flex max-w-[220px] flex-col gap-1">
          <span className="truncate">{r.name || r.email}</span>
          <span className="caption-style truncate text-subtle">{[r.city, r.phone].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { key: "items", header: "Items", align: "right", cell: (r) => r.items },
    { key: "total", header: "Total", align: "right", cell: (r) => <span className="font-medium">{rupees(r.total)}</span> },
    { key: "payment", header: "Payment", cell: (r) => <PaymentTag status={r.paymentStatus} method={r.paymentMethod} orderStatus={r.status} /> },
    { key: "status", header: "Status", cell: (r) => <OrderStatusTag status={r.status} /> },
  ];

  return (
    <>
      <PageHeader title="Orders" tabs={tabs} tab={view} onTab={setView} />
      <Toolbar
        actions={
          <ExportMenu
            variant="secondary"
            csvHref="/api/admin/export/orders"
            csvLabel={`All ${rows.length} orders with items and addresses`}
            pdfLabel={`This list: ${filtered.length} order${filtered.length === 1 ? "" : "s"}`}
            onPdf={() =>
              downloadPdf({
                title: "Orders",
                subtitle: [VIEWS[view].label, payment !== "all" && (payment === "cod" ? "Cash on delivery" : "Online"), PERIODS.find((p) => p.value === period)?.label, q && `"${q}"`].filter(Boolean).join(" · "),
                filename: `gnananetra-orders-${new Date().toISOString().slice(0, 10)}.pdf`,
                rows: filtered,
                columns: [
                  { header: "Order", value: (r) => r.number },
                  { header: "Date", value: (r) => formatDate(r.createdAt) },
                  { header: "Customer", value: (r) => r.name || r.email || "", width: 150 },
                  { header: "Phone", value: (r) => r.phone ?? "" },
                  { header: "City", value: (r) => r.city ?? "" },
                  { header: "Items", value: (r) => r.items, align: "right" },
                  { header: "Total", value: (r) => pdfRupees(r.total), align: "right" },
                  { header: "Payment", value: (r) => `${r.paymentMethod === "cod" ? "COD" : "Online"}, ${r.paymentStatus.replace("_", " ")}` },
                  { header: "Status", value: (r) => ORDER_STATUS_LABEL[r.status] ?? r.status },
                ],
                totals: [`${filtered.length} orders`, "", "", "", "", filtered.reduce((n, r) => n + r.items, 0), pdfRupees(filtered.reduce((n, r) => n + r.total, 0)), "", `confirmed: ${pdfRupees(revenue)}`],
              })
            }
          />
        }
      >
        <div className="relative w-full sm:w-[260px]">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., name, phone, city" className="h-9 pl-8 text-[14px] sm:h-[30px] sm:text-[13px]" />
        </div>
        <FilterMenu
          label="Payment"
          value={payment}
          onChange={setPayment}
          options={[
            { value: "all", label: "Any" },
            { value: "razorpay", label: "Online" },
            { value: "cod", label: "Cash on delivery" },
          ]}
        />
        <FilterMenu label="Period" value={period} onChange={setPeriod} options={PERIODS} />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => String(r.id)}
        onRowClick={(r) => router.push(`/admin/orders/${r.id}`)}
        emptyLabel="No orders match these filters."
        footer={<TableFooter items={[{ label: "orders", value: filtered.length }, { label: "confirmed sales", value: rupees(revenue) }]} />}
      />
    </>
  );
}
