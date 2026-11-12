"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { saveAddress } from "@/app/(shop)/actions";
import { INDIAN_STATES } from "@/lib/site";

type A = {
  id: number;
  label: string | null;
  name: string;
  phone: string | null;
  company: string | null;
  gstin: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function AddressForm({ address }: { address?: A }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveAddress, null);
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open)
    return address ? (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline btn-sm">
        Edit
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline">
        <Plus className="size-4" aria-hidden /> Add a new address
      </button>
    );

  const f = (k: keyof A) => (address?.[k] as string | null | undefined) ?? "";
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-night/50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Address">
      <form action={action} className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-surface p-6 shadow-pop animate-rise">
        <h2 className="text-[19px] font-extrabold">{address ? "Edit address" : "New address"}</h2>
        {address && <input type="hidden" name="id" value={address.id} />}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Full name", true, "sm:col-span-2"],
              ["phone", "Mobile", true, ""],
              ["label", "Label (Home, Office…)", false, ""],
              ["line1", "Flat / house no., building, street", true, "sm:col-span-2"],
              ["line2", "Area, locality", false, ""],
              ["landmark", "Landmark", false, ""],
              ["pincode", "Pincode", true, ""],
              ["city", "City / town", true, ""],
              ["company", "Company (optional)", false, ""],
              ["gstin", "GSTIN (optional)", false, ""],
            ] as const
          ).map(([k, label, req, span]) => (
            <div key={k} className={span}>
              <label htmlFor={`a-${k}`} className="label">
                {label}
              </label>
              <input id={`a-${k}`} name={k} required={req} defaultValue={f(k)} className="field" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label htmlFor="a-state" className="label">
              State
            </label>
            <select id="a-state" name="state" defaultValue={address?.state ?? "Andhra Pradesh"} className="field">
              {INDIAN_STATES.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-[14px] sm:col-span-2">
            <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-4 accent-brand-700" />
            Use as my default address
          </label>
        </div>
        {state?.error && <p className="mt-4 rounded-xl bg-danger-50 p-3 text-[14px] text-danger">{state.error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
            Cancel
          </button>
          <button disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save address"}
          </button>
        </div>
      </form>
    </div>
  );
}
