"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Thin saffron bar across the top while a page loads. On slow mobile data a tap
// otherwise feels ignored for a second; this answers it straight away.
export default function TopProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (timer.current) clearTimeout(timer.current);
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, params]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full origin-left bg-[linear-gradient(90deg,var(--color-gold),var(--color-brand))] shadow-[0_0_10px_var(--color-brand)]"
        style={{
          transform: state === "idle" ? "scaleX(0)" : state === "loading" ? "scaleX(0.8)" : "scaleX(1)",
          opacity: state === "idle" ? 0 : 1,
          transition:
            state === "loading" ? "transform 8s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.1s" : state === "done" ? "transform 0.2s ease-out, opacity 0.3s 0.15s" : "opacity 0.2s",
        }}
      />
    </div>
  );
}
