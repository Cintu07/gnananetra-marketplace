"use client";

import { ChevronDown } from "lucide-react";
import Button from "@/components/admin/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { cn } from "@/lib/cn";

export type FilterOption = { value: string; label: string };

type FilterMenuProps = {
  label?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  align?: "start" | "end";
  className?: string;
};

// A labelled dropdown pill: "Sort by | Newest ⌄".
export default function FilterMenu({ label, value, options, onChange, align = "start", className }: FilterMenuProps) {
  const current = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="none"
          className={cn("group h-9 gap-0 overflow-hidden text-[13px] data-[state=open]:bg-muted sm:h-[30px] sm:text-[12px]", className)}
        >
          {label && (
            <>
              <span className="px-[9px] font-normal text-subtle">{label}</span>
              <span aria-hidden className="h-full w-px bg-foreground/[0.12]" />
            </>
          )}
          <span className={cn("flex items-center px-[9px]", label ? "gap-1.5" : "gap-1")}>
            {current?.label ?? value}
            <ChevronDown
              aria-hidden
              className="size-3 text-subtle transition-transform duration-200 ease-power3-out group-data-[state=open]:rotate-180"
            />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
