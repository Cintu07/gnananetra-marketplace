"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-dark btn-sm">
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
