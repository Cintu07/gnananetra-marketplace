import { rupees } from "@/lib/money";

// Plain HTML bar chart: one bar per day, value on hover. No chart library needed for this.
export default function BarChart({ data, height = 180, format = rupees }: { data: { label: string; value: number; sub?: number }[]; height?: number; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { label: "", value: 0 });
  const day = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[24px] font-medium tracking-[-0.02em] tabular-nums">{format(total)}</span>
        {best && best.value > 0 && <span className="caption-style text-subtle">Best day {day(best.label)}: {format(best.value)}</span>}
      </figcaption>
      <div className="relative flex items-end gap-[3px]" style={{ height }} role="img" aria-label={`Bar chart of ${data.length} days, total ${format(total)}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <span key={f} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: f * height }} />
        ))}
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] bg-[#FDBA8C] transition-colors group-hover:bg-primary"
              style={{ height: d.value ? Math.max(3, (d.value / max) * height) : 1, opacity: d.value ? 1 : 0.4 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-foreground px-2 py-1.5 text-[11.5px] whitespace-nowrap text-white shadow-overlay group-hover:block">
              {day(d.label)} · {format(d.value)}
              {d.sub !== undefined && ` · ${d.sub} order${d.sub === 1 ? "" : "s"}`}
            </div>
          </div>
        ))}
      </div>
      <div className="caption-style flex justify-between text-subtle">
        <span>{data[0] ? day(data[0].label) : ""}</span>
        <span>{data.length ? day(data[data.length - 1].label) : ""}</span>
      </div>
    </figure>
  );
}
