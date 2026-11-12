"use client";

import type { ComponentProps } from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-audit-skip
      className={cn(
        "relative before:absolute before:-inset-2.5 before:content-[''] ",
        "peer inline-flex h-6 w-11 shrink-0 sm:h-5 sm:w-9 cursor-pointer items-center rounded-full border border-line-strong bg-[#E4E4E7] outline-none transition-[background-color,border-color] duration-150 ease-power3-out focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-[18px] translate-x-[2px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-150 ease-power3-out data-[state=checked]:translate-x-[22px] sm:size-3.5 sm:translate-x-[3px] sm:data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
