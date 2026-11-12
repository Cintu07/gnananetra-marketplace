"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/admin/ui/input";
import { cn } from "@/lib/cn";

// Rupees on screen, paise in the data. Keeps its own text while typing so "12." and
// "0.5" don't get rewritten under the cursor.
export function RupeeInput({
  valuePaise,
  onChange,
  className,
  id,
  placeholder = "0",
}: {
  valuePaise: number;
  onChange: (paise: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}) {
  const fromPaise = (p: number) => (p ? String(p / 100) : "");
  const [text, setText] = useState(fromPaise(valuePaise));

  useEffect(() => {
    // Re-sync only when the parent value changed to something we didn't type.
    if (Math.round(Number(text || 0) * 100) !== valuePaise) setText(fromPaise(valuePaise));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuePaise]);

  return (
    <div className={cn("relative", className)}>
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-subtle">
        ₹
      </span>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9.]/g, "");
          setText(next);
          onChange(Math.round(Number(next || 0) * 100));
        }}
        className="pl-7 tabular-nums"
      />
    </div>
  );
}
