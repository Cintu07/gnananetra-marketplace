"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/toast";

type Result<T> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

// Run a server action from a click: shows a toast with the outcome and re-renders the
// page with fresh data. `busy` is true while it runs.
export function useRun() {
  const router = useRouter();
  const { toast, node } = useToast();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<Result<T>>, opts: { success?: string; refresh?: boolean } = {}) => {
      setBusy(true);
      try {
        const r = await fn();
        if (r.ok) {
          toast(r.message ?? opts.success ?? "Saved");
          if (opts.refresh !== false) router.refresh();
        } else toast(r.error, true);
        return r;
      } catch {
        toast("Could not reach the server. Check your connection.", true);
        return { ok: false as const, error: "network" };
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );

  return { run, busy, toast, toastNode: node };
}
