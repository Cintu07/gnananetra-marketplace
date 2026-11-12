"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveStoreProfile } from "@/app/(seller)/seller/actions";

type V = { storeName: string; tagline: string; about: string; phone: string; city: string; state: string; gstin: string; pickupAddress: string };

export default function StoreForm({ initial, slug, status }: { initial: V; slug: string; status: string }) {
  const [state, action, pending] = useActionState(saveStoreProfile, null);
  const f = (name: keyof V, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={initial[name]} className="field" {...props} />
    </div>
  );
  return (
    <form action={action} className="card space-y-4 p-5 sm:p-6">
      {f("storeName", "Store name", { required: true, maxLength: 80 })}
      {f("tagline", "Tagline", { maxLength: 120, placeholder: "e.g. Genuine printers, same day dispatch" })}
      <div>
        <label className="label" htmlFor="about">About your store</label>
        <textarea id="about" name="about" defaultValue={initial.about} maxLength={800} className="field min-h-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {f("phone", "Mobile number", { required: true, inputMode: "numeric", maxLength: 10 })}
        {f("gstin", "GSTIN (optional)", { maxLength: 15, className: "field uppercase" })}
        {f("city", "City", { required: true })}
        {f("state", "State", { required: true })}
      </div>
      <div>
        <label className="label" htmlFor="pickupAddress">Pickup address (where couriers collect orders)</label>
        <textarea id="pickupAddress" name="pickupAddress" defaultValue={initial.pickupAddress} required maxLength={400} className="field min-h-20" />
      </div>
      {state && !state.ok && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2.5 text-[13.5px] text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-lg bg-success-50 px-3 py-2.5 text-[13.5px] text-success">{state.message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-primary">{pending ? "Saving" : "Save store"}</button>
        {status === "approved" && <Link href={`/store/${slug}`} className="inline-flex min-h-10 items-center text-[14px] font-semibold text-brand-700">View my store page</Link>}
      </div>
    </form>
  );
}
