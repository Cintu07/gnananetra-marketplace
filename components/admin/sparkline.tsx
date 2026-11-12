import { cn } from "@/lib/cn";

// Tiny bar sparkline. Values are scaled against the series max into a 1-14px bar.
export default function Sparkline({
  values,
  className,
  height = 14,
}: {
  values: number[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <span aria-hidden className={cn("flex items-end gap-px", className)} style={{ height }}>
      {values.map((value, index) => {
        const h = Math.max(1, Math.round((value / max) * height));
        const last = index === values.length - 1;
        return (
          <span
            key={index}
            className={cn("w-1 shrink-0 rounded-[1px]", last ? "bg-trend" : "bg-trend-muted")}
            style={{ height: h }}
          />
        );
      })}
    </span>
  );
}
