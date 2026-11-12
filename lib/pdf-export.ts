"use client";

// Builds a PDF of an admin list in the browser. jsPDF is loaded only when someone clicks
// "PDF", so it costs nothing on normal page loads and nothing on the server.
// The built-in PDF fonts have no ₹ glyph, so amounts are written "Rs 25,697".

export type PdfColumn<T> = { header: string; value: (row: T) => string | number; align?: "left" | "right" | "center"; width?: number };

export { pdfRupees } from "@/lib/money";

/** Characters outside the PDF's built-in font would print as junk; swap the common ones. */
function clean(v: string | number) {
  return String(v ?? "")
    .replace(/₹/g, "Rs ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ]/g, "");
}

async function logoDataUrl() {
  try {
    const blob = await (await fetch("/brand/logo-pdf.jpg")).blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type PdfSection = { title?: string; columns: PdfColumn<any>[]; rows: any[]; totals?: (string | number)[] };

/** One list (products, orders, customers). */
export function downloadPdf<T>(opts: { title: string; subtitle?: string; columns: PdfColumn<T>[]; rows: T[]; totals?: (string | number)[]; filename: string; landscape?: boolean }) {
  return downloadSectionsPdf({ ...opts, sections: [{ columns: opts.columns, rows: opts.rows, totals: opts.totals }] });
}

/** Several titled tables in one document (reports). */
export async function downloadSectionsPdf({
  title,
  subtitle,
  sections,
  filename,
  landscape = true,
}: {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  filename: string;
  landscape?: boolean;
}) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = await logoDataUrl();
  const generated = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const header = () => {
    // same alias on every page = the logo is stored once in the file
    if (logo) doc.addImage(logo, "JPEG", 36, 22, 107, 30, "gn-logo");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(11, 18, 32);
    doc.text(clean(title), pageW - 36, 36, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(102, 102, 110);
    doc.text(clean(subtitle ? `${subtitle}  |  ${generated}` : generated), pageW - 36, 50, { align: "right" });
    doc.setDrawColor(249, 94, 6);
    doc.setLineWidth(1.5);
    doc.line(36, 62, pageW - 36, 62);
  };

  let y = 74;
  for (const section of sections) {
    if (section.title) {
      if (y > pageH - 120) {
        doc.addPage();
        y = 74;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 18, 32);
      doc.text(clean(section.title), 36, y + 12);
      y += 20;
    }
    autoTable(doc, {
      startY: y,
      margin: { top: 74, left: 36, right: 36, bottom: 40 },
      head: [section.columns.map((c) => c.header)],
      body: section.rows.map((r) => section.columns.map((c) => clean(c.value(r)))),
      foot: section.totals ? [section.totals.map(clean)] : undefined,
      showFoot: "lastPage",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: [24, 24, 27], lineColor: [231, 230, 226], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: [11, 19, 36], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [255, 246, 240], textColor: [24, 24, 27], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      columnStyles: Object.fromEntries(section.columns.map((c, i) => [i, { halign: c.align ?? "left", ...(c.width ? { cellWidth: c.width } : {}) }])),
      didDrawPage: () => {
        header();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 155);
        doc.text("Gnananetra Industries Private Limited", 36, pageH - 20);
      },
    });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? y) + 22;
  }

  // "Page x of y" once the page count is known
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 155);
    doc.text(`Page ${i} of ${pages}`, pageW - 36, pageH - 20, { align: "right" });
  }
  doc.save(filename);
}
