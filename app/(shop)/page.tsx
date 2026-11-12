import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgePercent, FileText, ShieldCheck, Truck, RefreshCcw, PhoneCall, MapPin } from "lucide-react";
import { getBanners, getCards, getCatalog, getDeals, inStock, listProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import HeroCarousel from "@/components/shop/HeroCarousel";
import { isPhoto } from "@/lib/site";
import Countdown from "@/components/shop/Countdown";
import Rail from "@/components/shop/Rail";
import ScrollRow from "@/components/shop/ScrollRow";
import ProductCard from "@/components/shop/ProductCard";
import SellerStrip from "@/components/shop/SellerStrip";

const BADGE_ICONS = [Truck, RefreshCcw, ShieldCheck, FileText];

// Column counts per breakpoint, picked so the last row is as full as possible
// (10 departments in 3 columns would leave one tile alone on its own row).
const SM_COLS: Record<number, string> = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5" };
const LG_COLS: Record<number, string> = { 5: "lg:grid-cols-5", 6: "lg:grid-cols-6", 7: "lg:grid-cols-7", 8: "lg:grid-cols-8" };
const XL_COLS: Record<number, string> = { 5: "xl:grid-cols-5", 6: "xl:grid-cols-6", 7: "xl:grid-cols-7", 8: "xl:grid-cols-8", 9: "xl:grid-cols-9", 10: "xl:grid-cols-10" };
function bestCols(n: number, options: number[]) {
  // fewest empty slots in the last row; ties go to more columns
  const gap = (c: number) => (n % c === 0 ? 0 : c - (n % c));
  return [...options].sort((a, b) => gap(a) - gap(b) || b - a)[0];
}

export default async function HomePage() {
  const [banners, settings, catalog, deals] = await Promise.all([getBanners(), getSettings(), getCatalog(), getDeals(10)]);
  const hero = banners.filter((b) => b.placement === "hero");
  const promos = banners.filter((b) => b.placement === "promo").slice(0, 2);

  // one tile per department, pictured by its best in-stock product
  const tiles = [...catalog.tree]
    .sort((a, b) => a.sort - b.sort || b.count - a.count)
    .map((c) => {
      const pick = catalog.cards.find((p) => p.categoryIds.includes(c.id) && inStock(p) && p.image) ?? catalog.cards.find((p) => p.categoryIds.includes(c.id) && p.image);
      return { ...c, picture: c.image || pick?.image || null };
    });
  const n = tiles.length;
  const tileCols = `${SM_COLS[bestCols(n, [3, 4, 5])]} ${LG_COLS[bestCols(n, [5, 6, 7, 8])]} ${XL_COLS[n <= 10 ? Math.max(5, n) : bestCols(n, [6, 7, 8, 9, 10])]}`;

  const featured = settings.home.featuredCategorySlugs
    .map((slug) => catalog.categoryBySlug.get(slug))
    .filter((c): c is NonNullable<typeof c> => !!c && c.count > 0);
  const rails = await Promise.all(featured.map(async (c) => ({ c, items: await getCards({ category: c.slug, limit: 10 }) })));
  const newest = (await listProducts({ sort: "newest", perPage: 10, inStock: true }))?.items ?? [];
  const tel = settings.store.phone.replace(/\s/g, "");
  // a timer only when a deal really ends: a clock that resets every midnight is false urgency
  const dealEnd = deals.map((d) => d.dealEndsAt).filter((d): d is string => !!d).sort()[0] ?? null;
  const brandCols = `${SM_COLS[bestCols(catalog.brands.length, [3, 4, 5])]} ${LG_COLS[bestCols(catalog.brands.length, [6, 7, 8])]}`;

  return (
    <>
      <section className="wrap mt-4 grid gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <HeroCarousel slides={hero} />
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1">
          {promos.map((p) => {
            const dark = p.theme === "dark";
            const photo = !!p.image && isPhoto(p.image);
            return (
              <Link
                key={p.id}
                href={p.ctaHref || "/shop"}
                className={`group relative flex min-h-[168px] overflow-hidden rounded-3xl transition-shadow hover:shadow-lift ${dark ? "bg-night text-white" : "bg-surface text-ink ring-1 ring-line"}`}
              >
                {p.image && photo && (
                  <>
                    <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    <div aria-hidden className={`absolute inset-0 ${dark ? "bg-[linear-gradient(90deg,rgb(11_19_36/0.9)_0%,rgb(11_19_36/0.55)_60%,transparent_100%)]" : "bg-[linear-gradient(90deg,rgb(255_255_255/0.95)_0%,rgb(255_255_255/0.7)_60%,transparent_100%)]"}`} />
                  </>
                )}
                <div className="relative z-10 flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                  {p.eyebrow && <p className={`text-[12px] font-semibold tracking-[0.14em] uppercase ${dark ? "text-brand-200" : "text-brand-700"}`}>{p.eyebrow}</p>}
                  <h3 className="mt-2 text-[19px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[20px]">{p.title}</h3>
                  {p.subtitle && <p className={`mt-1.5 text-[13.5px] leading-snug ${dark ? "text-white/70" : "text-muted"}`}>{p.subtitle}</p>}
                  <span className={`mt-auto flex items-center gap-1.5 pt-4 text-[14px] font-semibold ${dark ? "text-white" : "text-ink"}`}>
                    {p.ctaLabel || "Shop now"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
                {p.image && !photo && (
                  <div aria-hidden className={`relative m-2 w-[40%] shrink-0 overflow-hidden rounded-[1.1rem] ${dark ? "bg-white" : "bg-canvas"}`}>
                    <Image src={p.image} alt="" fill sizes="160px" className={`object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] ${dark ? "" : "mix-blend-multiply"}`} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="wrap mt-6 sm:mt-8" aria-label="Why shop with us">
        <ul className="grid grid-cols-2 gap-x-5 gap-y-5 border-y border-line py-5 sm:py-6 lg:grid-cols-4 lg:gap-x-8">
          {settings.home.trustBadges.map((b, idx) => {
            const Icon = BADGE_ICONS[idx % BADGE_ICONS.length];
            return (
              <li key={b.title} className="flex gap-2.5">
                <Icon className="mt-[3px] size-[17px] shrink-0 text-brand-700" strokeWidth={1.8} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] leading-snug font-semibold text-ink">{b.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{b.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="reveal wrap mt-12" aria-labelledby="cat-title">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1.5">Departments</p>
            <h2 id="cat-title" className="section-title">
              Shop by category
            </h2>
          </div>
          <Link href="/shop" className="group -my-2 flex items-center gap-1.5 py-2.5 text-[14px] font-bold text-brand-700">
            All products
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        {/* phones: two columns of compact rows (an odd last one spans both); wider: picture tiles */}
        <ul className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${tileCols}`}>
          {tiles.map((c) => (
            <li key={c.slug} className="max-sm:last:odd:col-span-2">
              <Link
                href={`/category/${c.slug}`}
                className="group flex h-full items-center gap-3 rounded-2xl bg-surface p-2 pr-3 ring-1 ring-line transition-[box-shadow,color] hover:shadow-lift hover:ring-line-2 sm:flex-col sm:gap-0 sm:p-3 sm:text-center"
              >
                <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-canvas sm:aspect-square sm:size-auto sm:w-full">
                  {c.picture && <Image src={c.picture} alt="" fill sizes="(min-width: 640px) 160px, 56px" className="object-contain p-1.5 mix-blend-multiply transition-transform duration-500 group-hover:scale-105 sm:p-4" />}
                </span>
                <span className="min-w-0 sm:mt-3">
                  <span className="line-clamp-2 block text-[13.5px] leading-tight font-semibold text-ink">{c.name}</span>
                  <span className="mt-0.5 block text-[12px] text-muted tabular-nums">
                    {c.count} item{c.count === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {settings.home.showDeals && deals.length > 0 && (
        <section className="reveal mt-12 bg-night py-10 text-white sm:mx-4 sm:rounded-3xl xl:mx-auto xl:max-w-[1320px]">
          <div className="wrap">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold tracking-[0.14em] text-brand uppercase">
                  <BadgePercent className="size-4" aria-hidden />
                  {dealEnd ? "Limited time" : "Best prices"}
                </p>
                <h2 className="text-[24px] font-extrabold tracking-[-0.02em] sm:text-[28px]">{dealEnd ? "Deals of the day" : "Deals"}</h2>
              </div>
              <div className="flex items-center gap-5">
                {dealEnd && <Countdown until={dealEnd} tone="dark" />}
                <Link href="/deals" className="hidden min-h-10 items-center gap-1.5 text-[14px] font-bold text-white hover:text-brand-200 sm:flex">
                  View all <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
            <ScrollRow
              label="Deals"
              arrowsClass="lg:hidden"
              listClass="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0"
            >
              {deals.map((p) => (
                <li key={p.id} className="w-[46vw] max-w-[240px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                  <ProductCard p={p} showDeal />
                </li>
              ))}
            </ScrollRow>
            <Link href="/deals" className="mt-6 flex min-h-11 items-center justify-center gap-1.5 text-[14px] font-semibold text-white/85 hover:text-white sm:hidden">
              View all deals <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {rails.map(({ c, items }) => (
        <Rail key={c.slug} title={c.name} eyebrow={`${c.count} products`} href={`/category/${c.slug}`} items={items} />
      ))}

      <section className="reveal wrap mt-12 grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-2">
        {/* bulk orders: warm saffron field with a gold glow and fine grain */}
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-700 p-7 text-white sm:p-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_100%_0%,rgb(246_196_93/0.55)_0%,transparent_60%),radial-gradient(80%_80%_at_0%_100%,rgb(11_19_36/0.55)_0%,transparent_65%),linear-gradient(135deg,var(--color-brand-700)_0%,var(--color-brand)_100%)]"
          />
          <div aria-hidden className="grain -z-10" />
          <p className="text-[12px] font-semibold tracking-[0.14em] text-white/80 uppercase">For offices, schools and institutions</p>
          <h2 className="mt-3 max-w-md text-[25px] leading-[1.12] font-extrabold tracking-[-0.025em] text-balance sm:text-[28px]">Equip your whole office at once, at business prices</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">Tell us what you need and how many. We&apos;ll send a quote with GST invoice and delivery timelines.</p>
          <Link href="/contact?topic=bulk" className="btn mt-7 bg-white text-ink hover:bg-brand-50">
            Request a bulk quote <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* talk to us: soft paper with a peach and gold wash */}
        <div className="relative isolate overflow-hidden rounded-3xl bg-surface p-7 ring-1 ring-line sm:p-10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_100%_0%,var(--color-brand-100)_0%,transparent_65%),radial-gradient(60%_70%_at_0%_100%,var(--color-gold-50)_0%,transparent_70%)]"
          />
          <div aria-hidden className="grain -z-10 opacity-[0.12]" />
          <p className="eyebrow">Visit or call us</p>
          <h2 className="mt-3 max-w-md text-[25px] leading-[1.12] font-extrabold tracking-[-0.025em] text-balance sm:text-[28px]">Talk to a real person before you buy</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">Not sure which printer or laptop fits your work? Our team will help you choose, then deliver it to your door.</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <a href={`tel:${tel}`} className="btn-dark">
              <PhoneCall className="size-4" aria-hidden /> {settings.store.phone}
            </a>
            <Link href="/store-location" className="btn-outline bg-surface/70">
              <MapPin className="size-4" aria-hidden /> Store location
            </Link>
          </div>
        </div>
      </section>

      <Rail title="Just arrived" eyebrow="New in store" href="/shop?sort=newest" items={newest} />

      <SellerStrip />

      {catalog.brands.length > 0 && (
        <section className="reveal wrap mt-12" aria-labelledby="brand-title">
          <p className="eyebrow mb-1.5">Genuine products</p>
          <h2 id="brand-title" className="section-title mb-5">
            Shop by brand
          </h2>
          <ul className={`grid grid-cols-2 gap-3 ${brandCols}`}>
            {catalog.brands.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/brand/${b.slug}`}
                  className="flex h-20 flex-col items-center justify-center rounded-2xl bg-surface ring-1 ring-line transition hover:shadow-lift hover:ring-brand-200"
                >
                  <span className="text-[17px] font-extrabold tracking-[-0.02em]">{b.name}</span>
                  <span className="text-[12px] text-muted">{b.count} products</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
