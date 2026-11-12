"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { subscribe } from "@/app/(shop)/actions";

export default function Newsletter() {
  const [state, action, pending] = useActionState(subscribe, null);
  if (state?.ok)
    return (
      <p className="mt-3 flex items-center gap-2 text-[14px] font-medium text-success animate-rise">
        <Check className="size-4" aria-hidden /> You&apos;re on the list. Thank you!
      </p>
    );
  return (
    <form action={action} className="mt-3 flex max-w-sm gap-2">
      <label htmlFor="nl-email" className="sr-only">
        Email address
      </label>
      <input
        id="nl-email"
        name="email"
        type="email"
        required
        placeholder="you@company.com"
        className="h-10 min-w-0 flex-1 rounded-full border border-line-2 bg-surface px-4 text-[14px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
      />
      <button disabled={pending} className="btn-dark btn-sm h-10">
        {pending ? "…" : "Subscribe"}
      </button>
      {state?.error && <p className="sr-only">{state.error}</p>}
    </form>
  );
}
