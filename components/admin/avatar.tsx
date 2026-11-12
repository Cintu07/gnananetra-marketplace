import { cn } from "@/lib/cn";

// No photos for staff/customers, so a quiet initial in a ring does the job.
export default function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium leading-none text-chip outline outline-1 -outline-offset-1 outline-foreground/10",
        className,
      )}
    >
      {initial}
    </span>
  );
}
