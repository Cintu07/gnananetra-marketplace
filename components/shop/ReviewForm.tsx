"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/app/(shop)/actions";

export default function ReviewForm({ productId, defaultName }: { productId: number; defaultName?: string }) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [open, setOpen] = useState(false);

  if (state?.ok) return <p className="rounded-2xl bg-success-50 p-4 text-[14px] font-semibold text-success">{state.message}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline">
        Write a review
      </button>
    );

  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} className="p-0.5">
              <Star className={`size-7 ${(hover || rating) >= n ? "fill-gold text-gold" : "text-line-2"}`} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rv-name" className="label">
            Your name
          </label>
          <input id="rv-name" name="name" defaultValue={defaultName} required className="field" />
        </div>
        <div>
          <label htmlFor="rv-title" className="label">
            Headline <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="rv-title" name="title" className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="rv-body" className="label">
          Your review
        </label>
        <textarea id="rv-body" name="body" rows={4} required className="field" placeholder="How has it worked for you?" />
      </div>
      {state?.error && <p className="text-[14px] text-danger">{state.error}</p>}
      <button disabled={pending} className="btn-primary">
        {pending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
