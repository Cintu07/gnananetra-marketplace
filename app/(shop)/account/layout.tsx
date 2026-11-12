import Link from "next/link";
import { LogOut, Package, MapPin, UserRound, Heart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/(shop)/actions";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const links = [
    { href: "/account", label: "Orders", icon: Package },
    { href: "/account/addresses", label: "Addresses", icon: MapPin },
    { href: "/account/profile", label: "Profile and password", icon: UserRound },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
  ];
  return (
    <div className="wrap py-8">
      <p className="text-[14px] text-muted">My account</p>
      <h1 className="text-[28px] font-extrabold tracking-[-0.025em]">Hello, {user.name.split(" ")[0] || "there"}</h1>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex shrink-0 items-center gap-3 rounded-xl bg-surface px-4 py-3 text-[14.5px] font-semibold ring-1 ring-line hover:bg-canvas lg:bg-transparent lg:ring-0">
              <l.icon className="size-[18px] text-muted" aria-hidden />
              {l.label}
            </Link>
          ))}
          <form action={logout}>
            <button className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-[14.5px] font-semibold text-danger hover:bg-danger-50">
              <LogOut className="size-[18px]" aria-hidden />
              Sign out
            </button>
          </form>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
