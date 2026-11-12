"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Tiny toast: `const { toast, node } = useToast()`, render `{node}` once in the page.
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, bad = false) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ text, bad });
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);

  const node = msg ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-2.5rem)] items-center gap-2 rounded-lg border border-line-strong bg-popover px-4 py-3 text-[13px] leading-none text-foreground shadow-overlay duration-200 animate-in fade-in-0 slide-in-from-bottom-2"
    >
      <span className={cn("size-2 shrink-0 rounded-full", msg.bad ? "bg-danger" : "bg-status")} />
      {msg.text}
    </div>
  ) : null;

  return { toast, node };
}
