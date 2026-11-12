"use client";

import ExportMenu from "@/components/admin/export-menu";
import { downloadSectionsPdf, pdfRupees, type PdfSection } from "@/lib/pdf-export";

type Row = { label: string; value: number; n?: number };

// Reports page: the whole report as one PDF (summary + every breakdown), or the orders CSV.
export default function ReportExport({
  period,
  kpis,
  series,
  bucket,
  breakdowns,
}: {
  period: string;
  kpis: { label: string; value: string; hint: string }[];
  series: Row[];
  bucket: string;
  breakdowns: { title: string; rows: Row[]; unit: string }[];
}) {
  const breakdown = (title: string, rows: Row[], unit: string): PdfSection => {
    const total = rows.reduce((n, r) => n + r.value, 0);
    return {
      title,
      rows,
      columns: [
        { header: ((t) => t.charAt(0).toUpperCase() + t.slice(1))(title.replace(/^By /, "")), value: (r: Row) => r.label, width: 330 },
        { header: unit, value: (r: Row) => r.n ?? "", align: "right" },
        { header: "Sales", value: (r: Row) => pdfRupees(r.value), align: "right" },
        { header: "Share", value: (r: Row) => (total ? `${Math.round((r.value / total) * 100)}%` : ""), align: "right" },
      ],
    };
  };

  return (
    <ExportMenu
      variant="secondary"
      csvHref="/api/admin/export/orders"
      csvLabel="Every order, to analyse in Excel"
      pdfLabel={`This report (${period})`}
      onPdf={() =>
        downloadSectionsPdf({
          title: "Sales report",
          subtitle: period,
          filename: `gnananetra-report-${new Date().toISOString().slice(0, 10)}.pdf`,
          landscape: false,
          sections: [
            {
              title: "Summary",
              rows: kpis,
              columns: [
                { header: "Measure", value: (k: (typeof kpis)[number]) => k.label },
                { header: "Value", value: (k: (typeof kpis)[number]) => k.value, align: "right" },
                { header: "Note", value: (k: (typeof kpis)[number]) => k.hint },
              ],
            },
            {
              title: `Sales by ${bucket}`,
              rows: series,
              columns: [
                { header: bucket === "day" ? "Day" : "Month", value: (r: Row) => (bucket === "day" ? r.label : r.label.slice(0, 7)) },
                { header: "Orders", value: (r: Row) => r.n ?? "", align: "right" },
                { header: "Sales", value: (r: Row) => pdfRupees(r.value), align: "right" },
              ],
              totals: ["Total", series.reduce((n, r) => n + (r.n ?? 0), 0), pdfRupees(series.reduce((n, r) => n + r.value, 0))],
            },
            ...breakdowns.map((b) => breakdown(b.title, b.rows, b.unit)),
          ],
        })
      }
    />
  );
}
