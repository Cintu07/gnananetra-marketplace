import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const FIELD =
  "w-full min-w-0 rounded-lg border border-line-strong bg-secondary px-3 text-[14px] text-foreground outline-none transition-[border-color] duration-150 ease-power3-out placeholder:text-subtle focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("flex h-9 leading-none", FIELD, className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("block min-h-[88px] resize-y py-2.5 leading-snug", FIELD, className)}
      {...props}
    />
  );
}

export { Input, Textarea };
