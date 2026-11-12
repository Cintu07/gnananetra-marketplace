"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Kbd,
} from "@/components/admin/ui/command";
import { useAdmin } from "@/components/admin/admin-context";
import { ALL_NAV_ITEMS } from "@/components/admin/nav";

// Cmd/Ctrl+K: jump anywhere in the console, or straight to the queues that need work.
export default function CommandMenu() {
  const { base, counts, searchOpen, setSearchOpen } = useAdmin();
  const router = useRouter();

  function go(href: string) {
    setSearchOpen(false);
    router.push(href);
  }

  const shortcuts = [
    { label: "Orders to ship", href: `${base}/orders?view=to-ship`, hint: counts?.orders_to_ship },
    { label: "Add a new product", href: `${base}/products/new`, hint: undefined },
    { label: "Reviews waiting for approval", href: `${base}/reviews`, hint: counts?.reviews_pending },
    { label: "New inquiries and bulk quotes", href: `${base}/inquiries`, hint: counts?.inquiries_new },
    { label: "Update stock counts", href: `${base}/inventory`, hint: counts?.low_stock },
  ];

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Command menu"
      description="Search pages and jump to work that needs attention"
    >
      <Command>
        <CommandInput placeholder="Jump to a page or queue…" trailing={<Kbd>esc</Kbd>} />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Go to">
            {ALL_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.path}
                  value={`${item.label} ${item.keywords ?? ""}`}
                  onSelect={() => go(`${base}${item.path}`)}
                >
                  <Icon aria-hidden className="size-3.5 text-subtle" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Needs attention">
            {shortcuts.map((s) => (
              <CommandItem key={s.label} value={s.label} onSelect={() => go(s.href)}>
                <ArrowUpRight aria-hidden className="size-3.5 text-subtle" />
                <span className="flex-1">{s.label}</span>
                {s.hint !== undefined && s.hint > 0 && <span className="caption-style tabular-nums text-subtle">{s.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <CommandFooter>
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft aria-hidden className="size-3" />
            </Kbd>{" "}
            open
          </span>
        </CommandFooter>
      </Command>
    </CommandDialog>
  );
}
