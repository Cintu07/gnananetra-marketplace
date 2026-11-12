"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteSellerProduct, quickProduct } from "@/app/(seller)/seller/actions";

// Stock, visibility and delete from the list: each saves on its own and refreshes the page.
export default function ProductRowActions({ id, stock, status, name }: { id: number; stock: number | null; status: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(String(stock ?? 0));
  const [msg, setMsg] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? "" : (r as { error: string }).error);
      router.refresh();
    });

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <label className="sr-only" htmlFor={`stock-${id}`}>Stock for {name}</label>
      <input
        id={`stock-${id}`}
        inputMode="numeric"
        value={qty}
        onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onBlur={() => Number(qty) !== (stock ?? 0) && run(() => quickProduct(id, { stockQty: Number(qty || 0) }))}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), undefined)}
        className="field !h-10 !w-20 !px-2.5 !py-1 text-center tabular-nums"
      />
      <button type="button" disabled={pending} onClick={() => run(() => quickProduct(id, { status: status === "published" ? "draft" : "published" }))} className="btn-outline btn-sm" aria-label={status === "published" ? `Hide ${name}` : `Publish ${name}`}>
        {status === "published" ? <><EyeOff className="size-4" aria-hidden /> Hide</> : <><Eye className="size-4" aria-hidden /> Publish</>}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(`Delete "${name}"? Products with past orders are archived instead.`) && run(() => deleteSellerProduct(id))}
        className="grid size-10 place-items-center rounded-full text-faint hover:bg-danger-50 hover:text-danger"
        aria-label={`Delete ${name}`}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      {msg && <p role="alert" className="w-full text-[12.5px] text-danger">{msg}</p>}
    </div>
  );
}
