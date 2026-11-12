import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const tagVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border text-[13px] leading-none",
  {
    variants: {
      tone: {
        blue: "border-[var(--tag-blue-border)] bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]",
        purple: "border-[var(--tag-purple-border)] bg-[var(--tag-purple-bg)] text-[var(--tag-purple-text)]",
        green: "border-[var(--tag-green-border)] bg-[var(--tag-green-bg)] text-[var(--tag-green-text)]",
        moss: "border-[var(--tag-moss-border)] bg-[var(--tag-moss-bg)] text-[var(--tag-moss-text)]",
        red: "border-[var(--tag-red-border)] bg-[var(--tag-red-bg)] text-[var(--tag-red-text)]",
        orange: "border-[var(--tag-orange-border)] bg-[var(--tag-orange-bg)] text-[var(--tag-orange-text)]",
        amber: "border-[var(--tag-amber-border)] bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)]",
        teal: "border-[var(--tag-teal-border)] bg-[var(--tag-teal-bg)] text-[var(--tag-teal-text)]",
        yellow: "border-[var(--tag-yellow-border)] bg-[var(--tag-yellow-bg)] text-[var(--tag-yellow-text)]",
        neutral: "border-[var(--tag-neutral-border)] bg-[var(--tag-neutral-bg)] text-[var(--tag-neutral-text)]",
      },
      size: { md: "px-2", sm: "px-1.5" },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export type TagTone = NonNullable<VariantProps<typeof tagVariants>["tone"]>;

type TagProps = ComponentProps<"span"> & VariantProps<typeof tagVariants>;

export default function Tag({ tone, size, className, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone, size }), className)} {...props} />;
}
