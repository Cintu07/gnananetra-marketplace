import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import { getCatalog, getFooterPages } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import Logo from "@/components/shop/Logo";
import Newsletter from "@/components/shop/Newsletter";

const HELP_PAGES = new Set(["faqs", "shipping-policy", "returns"]);
const SHORT: Record<string, string> = { faqs: "FAQs", returns: "Returns", "shipping-policy": "Shipping", about: "About us", privacy: "Privacy", terms: "Terms" };

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-0.5 text-[14px] sm:space-y-2.5">{children}</ul>
    </div>
  );
}

function FLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  const cls = "inline-flex min-h-10 min-w-10 items-center gap-1 text-muted transition-colors hover:text-ink lg:min-h-0";
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noopener" className={cls}>
          {children}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {children}
        </Link>
      )}
    </li>
  );
}

export default async function Footer() {
  const [{ tree }, settings, pages] = await Promise.all([getCatalog(), getSettings(), getFooterPages()]);
  const { store } = settings;
  const top = [...tree].sort((a, b) => b.count - a.count).slice(0, 6);
  const tel = store.phone.replace(/\s/g, "");
  const year = new Date().getFullYear();
  const social = Object.entries(store.social ?? {}).filter(([, url]) => url);

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="wrap">
        <div className="flex flex-col gap-6 border-b border-line py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">Questions before you buy?</h2>
            <p className="mt-1.5 text-[15px] text-muted">Talk to our team in Vijayawada. {store.supportHours}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${tel}`} className="btn-dark btn-sm">
              <Phone className="size-4" aria-hidden /> {store.phone}
            </a>
            {store.whatsapp && (
              <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener" className="btn-outline btn-sm">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            )}
            <Link href="/contact?topic=bulk" className="btn-ghost btn-sm">
              Bulk quote <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Logo size={44} />
            <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
              {store.tagline}. Genuine products from brands you trust, a proper GST invoice, and real people to call after you buy.
            </p>
            <p className="mt-7 text-[13px] font-semibold text-ink">Deals and new arrivals, now and then</p>
            <Newsletter />
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            <Column title="Shop">
              {top.map((c) => (
                <FLink key={c.slug} href={`/category/${c.slug}`}>
                  {c.name}
                </FLink>
              ))}
              <FLink href="/deals">Deals</FLink>
              <FLink href="/shop">All products</FLink>
            </Column>
            <Column title="Help">
              <FLink href="/track">Track an order</FLink>
              <FLink href="/sell">Sell on Gnananetra</FLink>
              <FLink href="/account">My account</FLink>
              {pages
                .filter((p) => HELP_PAGES.has(p.slug))
                .map((p) => (
                  <FLink key={p.slug} href={`/${p.slug}`}>
                    {SHORT[p.slug] ?? p.title}
                  </FLink>
                ))}
              <FLink href="/contact">Contact us</FLink>
            </Column>
            <Column title="Company">
              {pages
                .filter((p) => !HELP_PAGES.has(p.slug))
                .map((p) => (
                  <FLink key={p.slug} href={`/${p.slug}`}>
                    {SHORT[p.slug] ?? p.title}
                  </FLink>
                ))}
              <FLink href="/contact?topic=bulk">For businesses</FLink>
              {social.map(([name, url]) => (
                <FLink key={name} href={url} external>
                  {name === "x" ? "X" : name.charAt(0).toUpperCase() + name.slice(1)}
                </FLink>
              ))}
            </Column>
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Visit</h2>
              <address className="mt-4 space-y-4 text-[14px] leading-relaxed text-muted not-italic">
                <p>
                  <span className="block font-medium text-ink-2">Store</span>
                  Ring Road, Bhavanipuram
                  <br />
                  Vijayawada 520012
                </p>
                {store.headOfficeAddress && (
                  <p>
                    <span className="block font-medium text-ink-2">Head office</span>
                    Tadepalli, Amaravati
                    <br />
                    Guntur 522501
                  </p>
                )}
                <p>
                  <a href={`mailto:${store.email}`} className="inline-flex min-h-10 items-center break-all hover:text-ink">
                    {store.email}
                  </a>
                </p>
                <Link href="/store-location" className="inline-flex min-h-10 items-center gap-1 font-medium text-brand-700 hover:text-brand-800 lg:min-h-0">
                  Directions <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </address>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-6 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {store.legalName}
            {store.gstin && <span className="ml-2">· GSTIN {store.gstin}</span>}
          </p>
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Payment methods">
            {["UPI", "RuPay", "Visa", "Mastercard", "Net banking", "Cash on delivery"].map((m) => (
              <li key={m} className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-2 ring-1 ring-line">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* the brand, large and quiet, cut by the edge of the page */}
      <div aria-hidden className="wrap pointer-events-none overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wordmark.svg" alt="" className="-mb-[3%] block w-full opacity-[0.09] [mask-image:linear-gradient(to_bottom,black_35%,transparent_100%)]" />
      </div>
    </footer>
  );
}
