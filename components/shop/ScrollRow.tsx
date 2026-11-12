"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A horizontal product row with previous and next buttons, so people can see it scrolls.
// `listClass` styles the list (it turns into a grid on wider screens); `arrowsClass` hides
// the buttons at the breakpoint where that happens, e.g. "sm:hidden".
export default function ScrollRow({
  children,
  label,
  listClass,
  arrowsClass = "",
}: {
  children: React.ReactNode;
  label: string;
  listClass: string;
  arrowsClass?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const move = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  const btn =
    "absolute top-[34%] z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface text-ink shadow-[0_1px_2px_rgb(16_24_40/0.08),0_4px_14px_-4px_rgb(16_24_40/0.25)] ring-1 ring-line transition-[opacity,transform] duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-0";

  return (
    <div className="relative">
      <ul ref={ref} onScroll={measure} aria-label={label} className={listClass}>
        {children}
      </ul>
      <button type="button" aria-label="Scroll left" disabled={edge.start} onClick={() => move(-1)} className={`${btn} -left-1 ${arrowsClass}`}>
        <ChevronLeft className="size-[18px]" aria-hidden />
      </button>
      <button type="button" aria-label="Scroll right" disabled={edge.end} onClick={() => move(1)} className={`${btn} -right-1 ${arrowsClass}`}>
        <ChevronRight className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}
