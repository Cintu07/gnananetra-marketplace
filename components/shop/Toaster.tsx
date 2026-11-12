"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Toast = { id: number; text: string; bad?: boolean };
let push: ((t: Omit<Toast, "id">) => void) | null = null;

/** Fire-and-forget toast from anywhere on the client. */
export function toast(text: string, bad = false) {
  push?.({ text, bad });
}

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list.slice(-2), { ...t, id }]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 3200);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {items.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-night px-4 py-3 text-[14px] font-medium text-white shadow-pop animate-rise">
          {t.bad ? <AlertCircle className="size-4 text-brand" aria-hidden /> : <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
