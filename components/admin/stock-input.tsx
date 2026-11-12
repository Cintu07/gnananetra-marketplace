"use client";

import { Minus, Plus } from "lucide-react";
import Button from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { cn } from "@/lib/cn";

// Whole-number stepper for stock counts: − [ 24 ] +
export function StockInput({
  value,
  onChange,
  className,
  invalid,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  invalid?: boolean;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(100000, Math.round(n) || 0));
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button variant="secondary" size="icon" aria-label="Decrease stock" onClick={() => onChange(clamp(value - 1))}>
        <Minus aria-hidden className="size-3" />
      </Button>
      <Input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))}
        aria-label="Stock"
        className={cn("h-[30px] w-full min-w-[56px] text-center tabular-nums", invalid && "border-danger")}
      />
      <Button variant="secondary" size="icon" aria-label="Increase stock" onClick={() => onChange(clamp(value + 1))}>
        <Plus aria-hidden className="size-3" />
      </Button>
    </div>
  );
}
