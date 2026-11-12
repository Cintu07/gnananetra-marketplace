import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, MapPin } from "lucide-react";
import { listProducts } from "@/lib/catalog";
import { db, schema as s } from "@/lib/db";
import Listing, { parseListParams, type RawParams } from "@/components/shop/Listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function getStore(slug: string) {
  const [row] = await db.select().from(s.sellers).where(and(eq(s.sellers.slug, slug), eq(s.sellers.status, "approved")));
  return row ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await getStore((await params).slug);
  return store ? { title: `${store.storeName}: store`, description: store.tagline ?? `Shop from ${store.storeName} on Gnananetra.`, alternates: { canonical: `/store/${store.slug}` } } : {};
}

export default async function StorePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const store = await getStore(slug);
  if (!store) notFound();
  const query = parseListParams(sp);
  const result = (await listProducts({ ...query, seller: slug }))!;
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="wrap flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:gap-6">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-gold-50 text-[26px] font-extrabold text-brand-800 ring-1 ring-brand-200" aria-hidden>
            {store.storeName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-[26px] leading-tight font-extrabold tracking-[-0.025em] sm:text-[32px]">
              {store.storeName}
              <BadgeCheck className="size-6 text-success" aria-label="Approved seller" />
            </h1>
            {store.tagline && <p className="mt-1 text-[15px] text-body">{store.tagline}</p>}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-muted">
              {store.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{store.city}, {store.state}</span>}
              <span>Selling since {store.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
            </p>
          </div>
        </div>
        {store.about && <p className="wrap max-w-3xl pb-8 text-[14.5px] leading-relaxed text-body">{store.about}</p>}
      </section>
      <Listing
        title="Products"
        intro={`${result.total} product${result.total === 1 ? "" : "s"} from ${store.storeName}`}
        crumbs={[{ href: "/shop", label: "Shop" }, { label: store.storeName }]}
        base={`/store/${slug}`}
        sp={sp}
        result={result}
        showBrandFilter={false}
      />
    </>
  );
}
