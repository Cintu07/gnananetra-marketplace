"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import Button from "@/components/admin/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";

// "Export ⌄": the full spreadsheet (CSV, opens in Excel / Google Sheets), or a PDF of
// exactly the rows on screen (current tab, search and filters).
export default function ExportMenu({
  csvHref,
  csvLabel,
  onPdf,
  pdfLabel,
  variant = "ghost",
}: {
  csvHref: string;
  csvLabel: string;
  onPdf: () => Promise<void>;
  pdfLabel: string;
  variant?: "ghost" | "secondary";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" disabled={busy} className="data-[state=open]:bg-muted">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Download className="size-3.5" aria-hidden />}
          {busy ? "Making PDF…" : "Export"}
          <ChevronDown className="size-3 text-subtle" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[250px]">
        <DropdownMenuLabel>Download</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={csvHref} target="_blank" rel="noopener">
            <FileSpreadsheet aria-hidden className="size-3.5 text-success" />
            <span className="flex flex-col gap-1">
              <span>Spreadsheet (CSV)</span>
              <span className="caption-style text-subtle">{csvLabel}</span>
            </span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            setError("");
            setBusy(true);
            try {
              await onPdf();
            } catch (e) {
              console.error(e);
              setError("Could not make the PDF. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <FileText aria-hidden className="size-3.5 text-danger" />
          <span className="flex flex-col gap-1">
            <span>PDF</span>
            <span className="caption-style text-subtle">{pdfLabel}</span>
          </span>
        </DropdownMenuItem>
        {error && <p className="caption-style px-2 pb-2 text-danger">{error}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
