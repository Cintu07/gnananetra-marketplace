"use client";

import type { ComponentProps, ReactNode } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { ScrollArea } from "@/components/admin/ui/scroll-area";

type CommandDialogProps = ComponentProps<typeof DialogPrimitive.Root> & {
  title: string;
  description: string;
  className?: string;
};

function CommandDialog({ title, description, className, children, ...props }: CommandDialogProps) {
  return (
    <DialogPrimitive.Root data-slot="command-dialog" {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#18181B]/50 backdrop-blur-[6px] duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[12dvh] z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-line-strong bg-popover text-popover-foreground shadow-overlay outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" loop className={cn("flex flex-col", className)} {...props} />;
}

type CommandInputProps = ComponentProps<typeof CommandPrimitive.Input> & { trailing?: ReactNode };

function CommandInput({ className, trailing, ...props }: CommandInputProps) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-12 items-center gap-2.5 border-b border-line-strong px-4"
    >
      <Search aria-hidden className="size-3.5 shrink-0 text-subtle" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-[14px] leading-none text-foreground outline-none placeholder:text-subtle",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  );
}

function CommandList({ className, children, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <ScrollArea viewportClassName="max-h-[min(360px,50dvh)]">
      <CommandPrimitive.List data-slot="command-list" className={cn("p-1.5", className)} {...props}>
        {children}
      </CommandPrimitive.List>
    </ScrollArea>
  );
}

function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("caption-style py-10 text-center text-subtle", className)}
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:leading-none [&_[cmdk-group-heading]]:tracking-[1px] [&_[cmdk-group-heading]]:text-faint",
        className,
      )}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex h-10 cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 text-[14px] leading-none text-soft outline-none transition-colors duration-150 ease-power3-out data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-foreground/[0.06] data-[selected=true]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CommandFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="command-footer"
      className={cn("caption-style flex h-10 items-center gap-4 border-t border-line-strong px-4 text-subtle", className)}
      {...props}
    />
  );
}

function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "caption-style inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-muted px-1.5 font-sans text-soft",
        className,
      )}
      {...props}
    />
  );
}

export { CommandDialog, Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandFooter, Kbd };
