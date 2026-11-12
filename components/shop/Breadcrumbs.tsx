import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
      <ol className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 whitespace-nowrap sm:mx-0 sm:flex-wrap sm:px-0 sm:whitespace-normal">
        <li>
          <Link href="/" className="-m-2 flex min-h-10 min-w-10 items-center gap-1 p-2 hover:text-ink" aria-label="Home">
            <Home className="size-3.5" aria-hidden />
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex shrink-0 items-center gap-1.5">
            <ChevronRight className="size-3.5 text-faint" aria-hidden />
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="inline-flex min-h-10 items-center min-w-10 hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="max-w-[60vw] truncate font-medium text-ink-2 sm:line-clamp-1 sm:max-w-none">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
