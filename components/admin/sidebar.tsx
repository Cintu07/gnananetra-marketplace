"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import Button from "@/components/admin/ui/button";
import CountBadge from "@/components/admin/ui/count-badge";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/admin/ui/sheet";
import Avatar from "@/components/admin/avatar";
import SidebarResizer from "@/components/admin/sidebar-resizer";
import { useAdmin } from "@/components/admin/admin-context";
import { NAV_SECTIONS, isActivePath } from "@/components/admin/nav";
import { cn } from "@/lib/cn";

function SidebarSection({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 p-3", className)}>
      {title && <span className="eyebrow-style block font-medium text-faint">{title}</span>}
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function SignOutButton() {
  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin/login");
    }
  }
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out" onClick={signOut}>
      <LogOut aria-hidden className="size-3.5" />
    </Button>
  );
}

export function SidebarContent() {
  const { base, counts, user } = useAdmin();
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar-accent p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg bg-white p-0.5 shadow-[0px_0px_0px_1px_#E7E6E2]" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="lead-style block truncate font-semibold tracking-[-0.01em]">Gnananetra</span>
          <span className="caption-style block truncate text-subtle">Admin console</span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Primary">
          {NAV_SECTIONS.map((section, index) => (
            <SidebarSection
              key={section.title ?? "main"}
              title={section.title}
              className={index < NAV_SECTIONS.length - 1 ? "border-b border-sidebar-border" : undefined}
            >
              {section.items.filter((item) => !item.ownerOnly || user.role === "admin").map((item) => {
                const active = isActivePath(pathname, base, item);
                const count = item.countKey ? counts?.[item.countKey] : undefined;
                const Icon = item.icon;
                return (
                  <li key={item.path} className={cn(active && "mb-[3px]")}>
                    <Button
                      variant="nav"
                      size="md"
                      href={`${base}${item.path}`}
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                      className="group h-[30px] gap-1.5 py-0 data-[active=true]:h-8"
                    >
                      <Icon
                        aria-hidden
                        className="size-3.5 shrink-0 text-subtle transition-colors duration-150 ease-power3-out group-hover:text-icon group-data-[active=true]:text-icon"
                      />
                      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                      {count !== undefined && count > 0 && <CountBadge>{count > 99 ? "99+" : count}</CountBadge>}
                    </Button>
                  </li>
                );
              })}
            </SidebarSection>
          ))}
        </nav>
      </ScrollArea>

      <SidebarSection className="shrink-0 border-t border-sidebar-border">
        <li>
          <Button
            variant="nav"
            size="md"
            href="/"
            target="_blank"
            className="group h-[30px] gap-1.5 py-0 text-subtle"
          >
            <ExternalLink aria-hidden className="size-3.5 shrink-0 text-subtle group-hover:text-icon" />
            <span className="min-w-0 flex-1 truncate text-left">View storefront</span>
          </Button>
        </li>
      </SidebarSection>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-t border-sidebar-border bg-sidebar-accent p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={user.name || user.email} className="size-7 text-[12px]" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="lead-style block truncate font-medium tracking-[-0.01em]">
              {user.name || user.email?.split("@")[0] || "Admin"}
            </span>
            <span className="caption-style block truncate text-subtle">{user.role}</span>
          </div>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAdmin();

  return (
    <>
      <aside className="relative hidden w-[var(--sidebar-width)] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarContent />
        <SidebarResizer />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[254px] max-w-[85vw] border-sidebar-border bg-sidebar">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Gnananetra admin sections</SheetDescription>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
