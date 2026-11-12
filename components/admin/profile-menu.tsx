"use client";

import { ExternalLink, LogOut } from "lucide-react";
import Button from "@/components/admin/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import Avatar from "@/components/admin/avatar";
import { useAdmin } from "@/components/admin/admin-context";

export default function ProfileMenu() {
  const { user } = useAdmin();
  const label = user.name || user.email?.split("@")[0] || "Admin";

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="none"
          className="caption-style h-10 gap-1.5 py-[5px] pl-[5px] pr-[7px] font-normal max-lg:min-w-10 lg:h-[30px]"
          aria-label={`Account menu for ${label}`}
        >
          <Avatar name={label} />
          <span className="hidden max-w-[120px] truncate sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel>
          {user.email ?? label} · {user.role}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden className="size-3.5 text-subtle" /> View storefront
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden className="size-3.5 text-subtle" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
