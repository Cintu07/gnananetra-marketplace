import { cn } from "@/lib/cn";

type SegmentTone = "auto" | "danger" | "warning" | "success" | "primary";

const TONE_CLASS: Record<Exclude<SegmentTone, "auto">, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  primary: "bg-primary",
};

function autoTone(index: number, filled: number) {
  const red = Math.floor(filled / 3);
  const amber = Math.ceil(filled / 3);
  if (index < red) return TONE_CLASS.danger;
  if (index < red + amber) return TONE_CLASS.warning;
  return TONE_CLASS.success;
}

// A row of little blocks that fills left to right, e.g. stock health or a share.
export default function SegmentBar({
  percent,
  segments = 17,
  tone = "auto",
  className,
}: {
  percent: number;
  segments?: number;
  tone?: SegmentTone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * segments);

  return (
    <span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("flex h-[14px] items-center gap-[2px] overflow-hidden rounded-[2px] bg-foreground/[0.12] px-[2px]", className)}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-[10px] min-w-px flex-1 rounded-[1px]",
            index < filled ? (tone === "auto" ? autoTone(index, filled) : TONE_CLASS[tone]) : "bg-track",
          )}
        />
      ))}
    </span>
  );
}
