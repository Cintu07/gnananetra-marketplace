"use client";

import { useEffect, useState } from "react";

/** Midnight tonight in India, as epoch ms. "Deals of the day" end then unless a deal has its own end. */
function endOfDayIST(now: number) {
  const ist = now + 5.5 * 3600_000;
  const next = Math.floor(ist / 86400_000 + 1) * 86400_000;
  return next - 5.5 * 3600_000;
}

export default function Countdown({ until, tone = "light", label = "Ends in" }: { until?: string | null; tone?: "light" | "dark"; label?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = until ? new Date(until).getTime() : now ? endOfDayIST(now) : 0;
  const left = now ? Math.max(0, target - now) : 0;
  const h = Math.floor(left / 3600_000);
  const m = Math.floor((left % 3600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const box = tone === "dark" ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-ink text-white";
  const parts = h >= 48 ? [[Math.floor(h / 24), "days"], [h % 24, "hrs"], [m, "min"]] : [[h, "hrs"], [m, "min"], [s, "sec"]];

  return (
    <div className="flex items-center gap-2" aria-label={now ? `${label} ${h} hours ${m} minutes` : label}>
      <span className={`text-[13px] font-semibold ${tone === "dark" ? "text-white/75" : "text-muted"}`}>{label}</span>
      <div className="flex items-center gap-1" aria-hidden>
        {parts.map(([v, unit], idx) => (
          <span key={String(unit)} className="flex items-center gap-1">
            <span className={`grid min-w-[38px] place-items-center rounded-lg px-1.5 py-1 leading-none ${box}`}>
              <span className="text-[15px] font-extrabold tabular-nums">{now ? String(v).padStart(2, "0") : "--"}</span>
              <span className="mt-0.5 text-[12px] font-semibold tracking-wider uppercase opacity-75">{unit}</span>
            </span>
            {idx < 2 && <span className="font-bold text-muted">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
