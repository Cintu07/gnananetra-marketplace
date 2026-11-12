"use client";

import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />;
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("no-scrollbar flex items-center gap-4 overflow-x-auto", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "group caption-style -mb-px grid shrink-0 cursor-pointer select-none border-b border-transparent py-4 text-center text-subtle outline-none transition-[color,border-color] duration-150 ease-power3-out hover:text-soft focus-visible:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    >
      {/* invisible bold copy reserves width so the tab never shifts when it turns bold */}
      <span aria-hidden className="invisible col-start-1 row-start-1 font-medium">
        {children}
      </span>
      <span className="col-start-1 row-start-1 group-data-[state=active]:font-medium">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
