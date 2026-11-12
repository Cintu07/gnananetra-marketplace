"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import Button from "@/components/admin/ui/button";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/ui/sheet";

// Slide-over used for "open a row" views: order, product, customer, message.
export default function DetailSheet({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-icon [&>svg]:size-3.5">{icon}</span>}
            <SheetTitle className="truncate">{title}</SheetTitle>
          </div>
          <SheetDescription className="sr-only">{description}</SheetDescription>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" className="-mr-1" aria-label="Close details">
              <X aria-hidden className="size-4 text-foreground" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>
        {footer && <SheetFooter className="h-auto min-h-[62px] flex-wrap py-3">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
