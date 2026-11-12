import type { ReactNode } from "react";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { cn } from "@/lib/cn";

// Scrolling, padded content area for pages that are not a full-bleed table.
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ScrollArea className="min-h-0 flex-1 border-t border-border">
      <div className={cn("mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4", className)}>{children}</div>
    </ScrollArea>
  );
}
