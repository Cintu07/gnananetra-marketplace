"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import type { CountKey } from "@/components/admin/nav";

export type AdminUser = { name?: string | null; email?: string | null; role: string };
export type Counts = Record<CountKey, number>;

type AdminContextValue = {
  base: string;
  user: AdminUser;
  counts: Counts | null;
  refreshCounts: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

export function AdminProvider({ base, user, children }: { base: string; user: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const refreshCounts = useCallback(() => {
    adminFetch<Counts>("/api/admin/counts").then((r) => r.data && setCounts(r.data));
  }, []);

  // Badges refresh on load, every minute, and whenever the tab regains focus.
  useEffect(() => {
    refreshCounts();
    const timer = setInterval(refreshCounts, 60_000);
    window.addEventListener("focus", refreshCounts);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshCounts);
    };
  }, [refreshCounts]);

  // Close the mobile drawer after navigating.
  useEffect(() => setSidebarOpen(false), [pathname]);

  // Cmd/Ctrl+K opens the command menu from anywhere.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ base, user, counts, refreshCounts, sidebarOpen, setSidebarOpen, searchOpen, setSearchOpen }),
    [base, user, counts, refreshCounts, sidebarOpen, searchOpen],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
