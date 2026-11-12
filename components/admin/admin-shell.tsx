"use client";

import type { ReactNode } from "react";
import { AdminProvider, type AdminUser } from "@/components/admin/admin-context";
import Sidebar from "@/components/admin/sidebar";
import CommandMenu from "@/components/admin/command-menu";

// Full-viewport console: resizable sidebar on the left, the page on the right. Each
// page owns its own header, toolbar and scrolling so tables can fill the height.
export default function AdminShell({
  base = "/admin",
  user,
  children,
}: {
  base?: string;
  user: AdminUser;
  children: ReactNode;
}) {
  return (
    <AdminProvider base={base} user={user}>
      <div className="flex h-dvh max-w-full overflow-hidden">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <CommandMenu />
    </AdminProvider>
  );
}
