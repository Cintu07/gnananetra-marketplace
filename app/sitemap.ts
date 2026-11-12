import type { MetadataRoute } from "next";
import { getCatalog, getFooterPages } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

// built on request (the database only exists at runtime on Cloudflare); the catalogue it reads is cached
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ cards, categories, brands }, pages] = await Promise.all([getCatalog(), getFooterPages()]);
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/deals`, lastModified: now, priority: 0.7 },
    { url: `${SITE_URL}/contact`, priority: 0.4 },
    { url: `${SITE_URL}/store-location`, priority: 0.4 },
    ...categories.filter((c) => c.count > 0).map((c) => ({ url: `${SITE_URL}/category/${c.slug}`, lastModified: now, priority: 0.7 })),
    ...brands.map((b) => ({ url: `${SITE_URL}/brand/${b.slug}`, priority: 0.5 })),
    ...cards.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: new Date(p.createdAt), priority: 0.6 })),
    ...pages.map((p) => ({ url: `${SITE_URL}/${p.slug}`, priority: 0.3 })),
  ];
}
