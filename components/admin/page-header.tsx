"use client";

import type { ReactNode } from "react";
import { Menu, Search } from "lucide-react";
import Button from "@/components/admin/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import Notifications from "@/components/admin/notifications";
import ProfileMenu from "@/components/admin/profile-menu";
import { useAdmin } from "@/components/admin/admin-context";
import { cn } from "@/lib/cn";

export type HeaderTab = { value: string; label: string; count?: number };

// Title row (menu / title / status chip ... search / bell / account) with an optional
// tab strip underneath. Every admin page starts with one of these.
export default function PageHeader({
  title,
  chip,
  tabs,
  tab,
  onTab,
}: {
  title: string;
  chip?: { label: string; tone?: "live" | "warn" | "muted" };
  tabs?: HeaderTab[];
  tab?: string;
  onTab?: (value: string) => void;
}) {
  const { setSidebarOpen, setSearchOpen } = useAdmin();

  return (
    <header className="shrink-0">
      <div className="flex items-center justify-between gap-2 px-4 py-[14px]">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu aria-hidden className="size-3.5" />
          </Button>
          <h1 className="truncate text-primary">{title}</h1>
          {chip && (
            <span className="caption-style hidden shrink-0 items-center gap-1 rounded-full border border-line-strong bg-muted sm:inline-flex py-[3px] pl-[5px] pr-[7px]">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  chip.tone === "warn" ? "bg-warning" : chip.tone === "muted" ? "bg-subtle" : "bg-status",
                )}
              />
              {chip.label}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Search"
            aria-keyshortcuts="Meta+K Control+K"
            onClick={() => setSearchOpen(true)}
          >
            <Search aria-hidden className="size-3.5" />
          </Button>
          <Notifications />
          <ProfileMenu />
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <Tabs value={tab} onValueChange={onTab}>
          <TabsList className="border-b border-border px-4">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 text-subtle">{t.count}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </header>
  );
}

// The strip of filter pills and buttons that sits between the header and a table.
export function Toolbar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-4">
      <div className="flex min-w-0 flex-wrap gap-2">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
