import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import HeaderSearch from "@/components/shop/HeaderSearch";
import Logo from "@/components/shop/Logo";
import HeaderActions from "@/components/shop/HeaderActions";
import CategoryBar, { type NavCategory } from "@/components/shop/CategoryBar";
import MobileMenu from "@/components/shop/MobileMenu";

export default async function Header() {
  const [{ tree }, settings, session] = await Promise.all([getCatalog(), getSettings(), getSession()]);
  const nav: NavCategory[] = [...tree]
    .sort((a, b) => a.sort - b.sort || b.count - a.count)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      count: c.count,
      children: c.children
        .filter((k) => k.count > 0)
        .sort((a, b) => a.sort - b.sort || b.count - a.count)
        .map((k) => ({ name: k.name, slug: k.slug, count: k.count })),
    }));
  const account = session ? { name: session.name || "Account", admin: session.role !== "customer" } : null;
  const { store, home } = settings;
  // first sentence of the announcement reads bright, the rest quieter
  const [lead, ...more] = home.announcement.split(/(?<=\.)\s+/);
  const rest = more.join(" ");

  return (
    <>
      {/* utility bar: contact on the left, the offer centred, help links on the right */}
      <div className="border-b border-white/[0.06] bg-night text-[12.5px] text-white/55">
        <div className="wrap grid h-10 grid-cols-[minmax(0,1fr)] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hidden items-center gap-2 justify-self-start transition-colors hover:text-white lg:flex">
            <Phone aria-hidden className="size-3.5" strokeWidth={1.8} />
            <span className="tabular-nums">{store.phone}</span>
            <span aria-hidden className="text-white/25">/</span>
            <span>{store.supportHours}</span>
          </a>

          {home.announcement && (
            <Link href={home.announcementHref || "/shop"} className="group flex min-h-10 min-w-0 items-center justify-center gap-2.5 justify-self-center">
              <span className="truncate">
                <span className="font-medium text-white">{lead}</span>
                {rest && <span className="hidden sm:inline"> {rest}</span>}
              </span>
              <span className="hidden shrink-0 items-center gap-1 font-medium text-brand-200 transition-colors group-hover:text-white sm:flex">
                Shop now
                <ArrowRight aria-hidden className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}

          <nav aria-label="Help" className="hidden items-center gap-5 justify-self-end lg:flex">
            <Link href="/track" className="transition-colors hover:text-white">
              Track order
            </Link>
            <Link href="/sell" className="font-semibold text-brand-200 transition-colors hover:text-white">
              Sell on Gnananetra
            </Link>
            <Link href="/store-location" className="flex items-center gap-1.5 transition-colors hover:text-white">
              <MapPin aria-hidden className="size-3.5" strokeWidth={1.8} />
              Vijayawada store
            </Link>
          </nav>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_0_var(--color-line)]">
      {/* phones and tablets: menu | logo centred | actions. Wider: logo, search, actions in a row */}
      <div className="wrap grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-2 sm:gap-3 sm:py-3 md:flex lg:gap-8 lg:py-4">
        <MobileMenu nav={nav} phone={store.phone} account={account} />
        <Link href="/" className="shrink-0 justify-self-center" aria-label={`${store.name} home`}>
          {/* one logo per breakpoint; the wrappers own display, so the two never show together */}
          <span className="block sm:hidden">
            <Logo size={34} />
          </span>
          <span className="hidden sm:block">
            <Logo size={44} />
          </span>
        </Link>
        <div className="hidden flex-1 md:block">
          <HeaderSearch />
        </div>
        <HeaderActions account={account} />
      </div>
      <div className="wrap pb-2.5 md:hidden">
        <HeaderSearch />
      </div>

      <CategoryBar nav={nav} />
      </header>
    </>
  );
}
