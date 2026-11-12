"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitInquiry } from "@/app/(shop)/actions";

export default function ContactForm({ initialKind, product }: { initialKind: "contact" | "bulk_quote"; product: { id: number; name: string } | null }) {
  const [state, action, pending] = useActionState(submitInquiry, null);
  const [kind, setKind] = useState(initialKind);

  if (state?.ok)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <p className="text-[19px] font-extrabold">Message sent</p>
        <p className="max-w-sm text-[14.5px] text-muted">{state.message}</p>
      </div>
    );

  const v = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {product && <input type="hidden" name="productId" value={product.id} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div role="radiogroup" aria-label="Topic" className="grid grid-cols-2 rounded-full bg-canvas p-1 ring-1 ring-line">
        {(
          [
            ["contact", "General question"],
            ["bulk_quote", "Bulk quote"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-full py-2.5 text-[14px] font-bold ${kind === k ? "bg-surface shadow-card" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-name" className="label">
            Your name
          </label>
          <input id="ct-name" name="name" required defaultValue={v.name} autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="ct-phone" className="label">
            Mobile number
          </label>
          <input id="ct-phone" name="phone" type="tel" required defaultValue={v.phone} autoComplete="tel" className="field" />
        </div>
        <div>
          <label htmlFor="ct-email" className="label">
            Email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="ct-email" name="email" type="email" defaultValue={v.email} autoComplete="email" className="field" />
        </div>
        <div>
          <label htmlFor="ct-company" className="label">
            Company / institution <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="ct-company" name="company" defaultValue={v.company} autoComplete="organization" className="field" />
        </div>
        {kind === "bulk_quote" && (
          <div>
            <label htmlFor="ct-qty" className="label">
              Approximate quantity
            </label>
            <input id="ct-qty" name="quantity" type="number" min={1} defaultValue={v.quantity} className="field" />
          </div>
        )}
        <div className={kind === "bulk_quote" ? "" : "sm:col-span-2"}>
          <label htmlFor="ct-subject" className="label">
            Subject
          </label>
          <input id="ct-subject" name="subject" defaultValue={v.subject ?? (product ? product.name : "")} className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="ct-message" className="label">
          {kind === "bulk_quote" ? "What do you need?" : "Message"}
        </label>
        <textarea
          id="ct-message"
          name="message"
          required
          rows={5}
          defaultValue={v.message ?? (product ? `I'd like a quote for ${product.name}.` : "")}
          className="field"
          placeholder={kind === "bulk_quote" ? "Products, models, quantities, delivery city and when you need them" : "How can we help?"}
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-50 p-3 text-[14px] text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary h-12 px-8">
        {pending ? "Sending…" : kind === "bulk_quote" ? "Request quote" : "Send message"}
      </button>
    </form>
  );
}
