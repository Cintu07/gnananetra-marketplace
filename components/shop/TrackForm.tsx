"use client";

import { useActionState } from "react";
import { trackOrder } from "@/app/(shop)/actions";

export default function TrackForm() {
  const [state, action, pending] = useActionState(trackOrder, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="t-number" className="label">
          Order number
        </label>
        <input id="t-number" name="number" required defaultValue={state?.fields?.number} placeholder="e.g. GN10055" className="field uppercase" />
      </div>
      <div>
        <label htmlFor="t-contact" className="label">
          Email or mobile number
        </label>
        <input id="t-contact" name="contact" required defaultValue={state?.fields?.contact} className="field" />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-50 p-3 text-[14px] text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary h-12 w-full">
        {pending ? "Looking…" : "Track order"}
      </button>
    </form>
  );
}
