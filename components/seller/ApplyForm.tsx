"use client";

import { useActionState } from "react";
import { applyToSell } from "@/app/(seller)/seller/actions";
import { INDIAN_STATES } from "@/lib/site";

export default function ApplyForm() {
  const [state, action, pending] = useActionState(applyToSell, null);
  const v = (k: string) => state?.fields?.[k] ?? "";
  return (
    <form action={action} className="mt-7 space-y-6">
      <fieldset className="card space-y-4 p-5 sm:p-6">
        <legend className="sr-only">About you</legend>
        <h2 className="text-[17px] font-bold">You</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" name="name" required autoComplete="name" defaultValue={v("name")} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile number</label>
            <input id="phone" name="phone" required inputMode="numeric" autoComplete="tel-national" maxLength={10} defaultValue={v("phone")} className="field" placeholder="10 digits" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={v("email")} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="password">Choose a password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" placeholder="At least 8 characters" />
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5 sm:p-6">
        <legend className="sr-only">Your store</legend>
        <h2 className="text-[17px] font-bold">Your store</h2>
        <div>
          <label className="label" htmlFor="storeName">Store name</label>
          <input id="storeName" name="storeName" required maxLength={80} defaultValue={v("storeName")} className="field" placeholder="e.g. Amaravati Computers" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" required defaultValue={v("city")} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="state">State</label>
            <select id="state" name="state" required defaultValue={v("state")} className="field">
              <option value="">Choose a state</option>
              {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pickupAddress">Pickup address <span className="font-normal text-muted">(where couriers collect your orders)</span></label>
          <textarea id="pickupAddress" name="pickupAddress" required maxLength={400} className="field min-h-20" />
        </div>
        <div>
          <label className="label" htmlFor="gstin">GSTIN <span className="font-normal text-muted">(optional)</span></label>
          <input id="gstin" name="gstin" maxLength={15} defaultValue={v("gstin")} className="field uppercase" placeholder="15 characters" />
        </div>
        <div>
          <label className="label" htmlFor="about">What do you sell? <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="about" name="about" maxLength={600} defaultValue={v("about")} className="field min-h-24" placeholder="A line or two about your business and your products" />
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-[14px] leading-relaxed text-body">
        <input type="checkbox" name="agree" required className="mt-1 size-5 shrink-0 accent-[var(--color-brand-700)]" />
        <span>I will sell only genuine, legal products, ship orders promptly, and accept the marketplace commission on each sale. Payouts are made for delivered orders.</span>
      </label>

      {state?.error && <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-[14px] text-danger">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-4 sm:w-auto sm:px-10">{pending ? "Sending your application" : "Submit application"}</button>
    </form>
  );
}
