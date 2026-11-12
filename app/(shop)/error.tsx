"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap py-20">
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-14 text-center">
        <AlertTriangle className="size-12 text-warn" aria-hidden />
        <h1 className="text-[22px] font-extrabold">Something went wrong on our side</h1>
        <p className="text-[14.5px] text-muted">Please try again. If it keeps happening, call us and we&apos;ll help you place your order.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-outline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
