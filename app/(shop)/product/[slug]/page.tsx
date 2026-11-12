import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, FileText, RefreshCcw, ShieldCheck, Star, Truck, Store, Check } from "lucide-react";
import { getCards, getProduct, getTrail } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { discountPercent, rupees } from "@/lib/money";
import { plainText } from "@/lib/sanitize";
import { SITE_URL, formatDate } from "@/lib/site";
import Breadcrumbs from "@/components/shop/Breadcrumbs";
import ProductGallery from "@/components/shop/ProductGallery";
import BuyBox from "@/components/shop/BuyBox";
import Countdown from "@/components/shop/Countdown";
import ReviewForm from "@/components/shop/ReviewForm";
import Rail from "@/components/shop/Rail";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const description = p.seoDescription || plainText(p.highlights.join(". ") || p.descriptionHtml, 158) || `Buy ${p.name} at Gnananetra.`;
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images.slice(0, 1).map((i) => i.url), type: "website" },
  };
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="flex" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${value >= n - 0.25 ? "fill-gold text-gold" : "text-line-2"}`} aria-hidden />
      ))}
    </span>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const [trail, settings, user] = await Promise.all([getTrail(p.categoryIds), getSettings(), getCurrentUser()]);
  const deepest = trail[trail.length - 1];
  const related = deepest ? await getCards({ category: deepest.slug, limit: 10, exclude: [p.id] }) : [];

  const available = p.stockStatus !== "out_of_stock" && (p.stockQty === null || p.stockQty > 0);
  const off = discountPercent(p.price, p.mrp);
  const maxQty = Math.max(1, Math.min(p.maxPerOrder ?? 20, p.stockQty ?? 20));
  const snapshot = { productId: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, price: p.price, mrp: p.mrp };
  const lowStock = p.stockQty !== null && p.stockQty > 0 && p.stockQty <= 5;
  const freeShip = settings.shipping.flatFee === 0 || p.price >= settings.shipping.freeShippingMin;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku ?? undefined,
    image: p.images.map((i) => (i.url.startsWith("/") ? `${SITE_URL}${i.url}` : i.url)),
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    description: plainText(p.highlights.join(". ") || p.descriptionHtml, 500),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price / 100).toFixed(2),
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/product/${p.slug}`,
      seller: { "@type": "Organization", name: settings.store.legalName },
    },
    aggregateRating: p.ratingCount ? { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } : undefined,
  };

  return (
    <div className="pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="wrap pt-5">
        <Breadcrumbs items={[{ href: "/shop", label: "Shop" }, ...trail.map((c) => ({ href: `/category/${c.slug}`, label: c.name })), { label: p.name }]} />

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-[150px] lg:self-start">
            <ProductGallery images={p.images} name={p.name} dim={!available} />
          </div>

          <div className="min-w-0">
            {p.brand && (
              <Link href={`/brand/${p.brand.slug}`} className="text-[13px] font-bold tracking-[0.1em] text-brand-700 uppercase hover:underline">
                {p.brand.name}
              </Link>
            )}
            <h1 className="mt-2 text-[24px] leading-[1.18] font-extrabold tracking-[-0.025em] text-balance sm:text-[30px]">{p.name}</h1>
            <p className="mt-2 text-[14px] text-muted">
              Sold by{" "}
              {p.seller ? (
                <Link href={`/store/${p.seller.slug}`} className="font-bold text-ink hover:text-brand-700 hover:underline">
                  {p.seller.name}
                </Link>
              ) : (
                <span className="font-bold text-ink">Gnananetra</span>
              )}
              {p.seller?.city ? <span> · {p.seller.city}</span> : null}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] text-muted">
              {p.ratingCount > 0 ? (
                <a href="#reviews" className="flex items-center gap-2 hover:text-ink">
                  <Stars value={p.ratingAvg} />
                  <span>
                    {p.ratingAvg.toFixed(1)} · {p.ratingCount} review{p.ratingCount > 1 ? "s" : ""}
                  </span>
                </a>
              ) : (
                <a href="#reviews" className="inline-flex min-h-10 items-center hover:text-ink">
                  Be the first to review
                </a>
              )}
              {p.sku && <span>SKU: {p.sku}</span>}
            </div>

            <div className="mt-5 rounded-2xl bg-surface p-5 ring-1 ring-line">
              {p.isDeal && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-night px-4 py-3 text-white">
                  <span className="text-[14px] font-bold">{p.dealEndsAt ? "Deal of the day" : "Special price"}</span>
                  {p.dealEndsAt && <Countdown until={p.dealEndsAt} tone="dark" />}
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{rupees(p.price)}</span>
                {off > 0 && (
                  <>
                    <s className="text-[16px] text-faint tabular-nums">MRP {rupees(p.mrp)}</s>
                    <span className="chip bg-success-50 py-1.5 text-[13px] text-success">
                      {off}% off · save {rupees((p.mrp ?? 0) - p.price)}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 text-[13px] text-muted">Inclusive of all taxes · GST invoice provided</p>

              <p className={`mt-4 flex items-center gap-2 text-[14px] font-bold ${available ? "text-success" : "text-danger"}`}>
                <span className={`size-2 rounded-full ${available ? "bg-success" : "bg-danger"}`} />
                {available ? (lowStock ? `Only ${p.stockQty} left in stock` : "In stock, ready to dispatch") : "Out of stock"}
              </p>

              {p.highlights.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-line pt-4">
                  {p.highlights.slice(0, 6).map((h) => (
                    <li key={h} className="flex gap-2.5 text-[14px] leading-snug text-body">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              {p.specs.length > 0 && (
                <a href="#specs" className="mt-1 inline-block py-2 text-[13.5px] font-semibold text-brand-700 hover:underline">
                  See all specifications
                </a>
              )}

              <div className="mt-5 border-t border-line pt-5">
                <BuyBox item={snapshot} available={available} maxQty={maxQty} />
              </div>
            </div>

            <ul className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-2">
              {[
                { icon: Truck, title: freeShip ? "Free delivery" : "Fast delivery", text: `Dispatched in ${settings.shipping.dispatchDays}` },
                { icon: RefreshCcw, title: "Easy replacement", text: "Report damage within 48 hours" },
                { icon: ShieldCheck, title: p.warranty || "Brand warranty", text: "Genuine product, manufacturer warranty" },
                { icon: FileText, title: "GST invoice", text: "Add your GSTIN at checkout" },
              ].map((b) => (
                <li key={b.title} className="flex items-start gap-3 bg-surface p-4">
                  <b.icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                  <span>
                    <span className="block text-[14px] font-bold">{b.title}</span>
                    <span className="block text-[12.5px] text-muted">{b.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
              <Store className="size-4" aria-hidden />
              Sold and shipped by <span className="font-semibold text-ink-2">{settings.store.legalName}</span>
              <BadgeCheck className="size-4 text-success" aria-hidden />
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-8">
            <nav aria-label="Product sections" className="sticky top-[106px] z-20 -mx-4 flex gap-1 overflow-x-auto bg-canvas/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:bg-surface sm:px-2 sm:ring-1 sm:ring-line lg:top-[150px]">
              {[
                p.descriptionHtml && { href: "#overview", label: "Overview" },
                p.specs.length > 0 && { href: "#specs", label: "Specifications" },
                { href: "#reviews", label: `Reviews (${p.ratingCount})` },
              ]
                .filter(Boolean)
                .map((l) => {
                  const link = l as { href: string; label: string };
                  return (
                    <a key={link.href} href={link.href} className="inline-flex shrink-0 min-h-10 items-center rounded-full px-4 text-[14px] font-semibold text-ink-2 hover:bg-canvas hover:text-ink">
                      {link.label}
                    </a>
                  );
                })}
            </nav>

            {p.descriptionHtml && (
              <section id="overview" className="card p-6 sm:p-8">
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Overview</h2>
                <div className="rich mt-4" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
              </section>
            )}

            {p.specs.length > 0 && (
              <section id="specs" className="card p-6 sm:p-8">
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Specifications</h2>
                <div className="mt-5 space-y-6">
                  {p.specs.map((g) => (
                    <div key={g.title}>
                      <h3 className="mb-2 text-[13px] font-bold tracking-[0.1em] text-muted uppercase">{g.title}</h3>
                      <dl className="overflow-hidden rounded-xl ring-1 ring-line">
                        {g.rows.map(([k, v], idx) => (
                          <div key={`${k}-${idx}`} className="grid grid-cols-[minmax(120px,38%)_1fr] text-[14px] odd:bg-canvas/60">
                            <dt className="px-4 py-2.5 font-medium text-muted">{k}</dt>
                            <dd className="px-4 py-2.5 text-ink">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section id="reviews" className="card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Customer reviews</h2>
                  {p.ratingCount > 0 && (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[32px] font-extrabold">{p.ratingAvg.toFixed(1)}</span>
                      <div>
                        <Stars value={p.ratingAvg} size="size-5" />
                        <p className="text-[13px] text-muted">
                          {p.ratingCount} review{p.ratingCount > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <ReviewForm productId={p.id} defaultName={user?.name} />
              </div>
              {p.reviews.length === 0 ? (
                <p className="mt-6 text-[14px] text-muted">No reviews yet. Bought this? Your review helps other buyers.</p>
              ) : (
                <ul className="mt-6 divide-y divide-line">
                  {p.reviews.map((r) => (
                    <li key={r.id} className="py-5">
                      <div className="flex items-center gap-3">
                        <Stars value={r.rating} />
                        {r.title && <p className="text-[15px] font-bold">{r.title}</p>}
                      </div>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-body">{r.body}</p>
                      <p className="mt-2 flex items-center gap-2 text-[12.5px] text-muted">
                        {r.name} · {formatDate(r.createdAt)}
                        {r.isVerified && (
                          <span className="flex items-center gap-1 font-semibold text-success">
                            <BadgeCheck className="size-3.5" aria-hidden /> Verified purchase
                          </span>
                        )}
                      </p>
                      {r.adminReply && <p className="mt-3 rounded-xl bg-canvas p-3 text-[13.5px] text-body"><span className="font-bold text-ink">Gnananetra replied: </span>{r.adminReply}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[150px] lg:self-start">
            <div className="card p-5">
              <p className="text-[15px] font-extrabold">Need help choosing?</p>
              <p className="mt-1.5 text-[13.5px] text-muted">Talk to our team for advice, bulk pricing or to check stock.</p>
              <div className="mt-4 grid gap-2">
                <a href={`tel:${settings.store.phone.replace(/\s/g, "")}`} className="btn-dark btn-sm">
                  Call {settings.store.phone}
                </a>
                {settings.store.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.store.whatsapp}?text=${encodeURIComponent(`Hi, I'm interested in ${p.name} (${SITE_URL}/product/${p.slug})`)}`}
                    target="_blank"
                    rel="noopener"
                    className="btn-outline btn-sm"
                  >
                    Ask on WhatsApp
                  </a>
                )}
                <Link href={`/contact?topic=bulk&product=${p.id}`} className="btn-ghost btn-sm text-brand-700">
                  Request a bulk quote
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Rail title="You may also like" eyebrow={deepest?.name} href={deepest ? `/category/${deepest.slug}` : undefined} items={related} />
    </div>
  );
}
