import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="wrap py-20">
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-14 text-center">
        <SearchX className="size-12 text-faint" aria-hidden />
        <h1 className="text-[24px] font-extrabold">We couldn&apos;t find that page</h1>
        <p className="text-[14.5px] text-muted">The link may be old or the product may have moved. Try searching, or start from the shop.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/shop" className="btn-primary">
            Go to shop
          </Link>
          <Link href="/" className="btn-outline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
