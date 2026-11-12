import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

// A raised card, same depth treatment as the sales-crm score cards.
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-lg bg-card p-4 shadow-[0px_1px_2px_0px_rgba(24,24,27,0.1),0px_0px_0px_1px_#E7E6E2]",
        className,
      )}
      {...props}
    />
  );
}

// One headline number: eyebrow label, big value, optional hint line.
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Panel className="flex flex-col gap-4 transition-colors duration-150 ease-power3-out hover:bg-[#FAFAF9]">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow-style text-subtle">{label}</span>
        {icon && <span className="text-icon [&>svg]:size-3.5">{icon}</span>}
      </div>
      <div className="flex flex-col gap-2">
        <span className={cn("text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums", accent && "text-primary")}>
          {value}
        </span>
        {hint && <span className="caption-style text-subtle">{hint}</span>}
      </div>
    </Panel>
  );
}

// A titled block inside a slide-over, divided by a hairline.
export function DetailSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4 p-5 shadow-[inset_0_-1px_0_#E7E6E2]", className)}>
      {action ? (
        <div className="flex h-[30px] items-center justify-between gap-2">
          <h4 className="eyebrow-style font-normal text-subtle">{title}</h4>
          {action}
        </div>
      ) : (
        <h4 className="eyebrow-style font-normal text-subtle">{title}</h4>
      )}
      {children}
    </section>
  );
}

// Label on the left, value on the right. Used for order/payment summaries.
export function KeyValue({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[14px] leading-snug">
      <span className="text-soft">{label}</span>
      <span className={cn("text-right tabular-nums", strong && "font-medium")}>{children}</span>
    </div>
  );
}
