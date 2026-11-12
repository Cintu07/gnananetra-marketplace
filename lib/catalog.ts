import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { SpecGroup } from "@/db/schema";

// The shop reads the catalogue through one cached index (every published product as a
// light "card"). Filtering, search, facets and sorting happen in memory: a few hundred
// to a few thousand products is far cheaper this way than a query per page view.
// Admin writes call updateTag("catalog") so changes show up immediately.

// A product is on sale when it is published AND (the marketplace sells it itself OR its seller is approved).
// Suspending a seller therefore hides their whole shelf at once, and approving brings it back.
export const visible = sql`${s.products.status} = 'published' and (${s.products.sellerId} is null or exists (select 1 from sellers where sellers.id = ${s.products.sellerId} and sellers.status = 'approved'))`;

export type Card = {
  id: number;
  slug: string;
  name: string;
  sku: string | null;
  price: number;
  mrp: number | null;
  stockStatus: string;
  stockQty: number | null;
  image: string | null;
  image2: string | null;
  brand: string | null;
  brandSlug: string | null;
  sellerName: string | null;
  sellerSlug: string | null;
  badge: string | null;
  isFeatured: boolean;
  isDeal: boolean;
  dealEndsAt: string | null;
  dealQuantity: number | null;
  dealSold: number;
  ratingAvg: number;
  ratingCount: number;
  totalSales: number;
  createdAt: string;
  categoryIds: number[];
  search: string;
};

export type Category = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort: number;
  count: number; // published products in this category or any child
  children: Category[];
};

export type Brand = { id: number; name: string; slug: string; logo: string | null; count: number };

export const inStock = (c: { stockStatus: string }) => c.stockStatus !== "out_of_stock";

const getIndex = unstable_cache(
  async () => {
    const rows = await db
      .select({
        id: s.products.id,
        slug: s.products.slug,
        name: s.products.name,
        sku: s.products.sku,
        price: s.products.price,
        mrp: s.products.mrp,
        stockStatus: s.products.stockStatus,
        stockQty: s.products.stockQty,
        badge: s.products.badge,
        isFeatured: s.products.isFeatured,
        isDeal: s.products.isDeal,
        dealEndsAt: s.products.dealEndsAt,
        dealQuantity: s.products.dealQuantity,
        dealSold: s.products.dealSold,
        ratingAvg: s.products.ratingAvg,
        ratingCount: s.products.ratingCount,
        totalSales: s.products.totalSales,
        createdAt: s.products.createdAt,
        brand: s.brands.name,
        brandSlug: s.brands.slug,
        sellerName: s.sellers.storeName,
        sellerSlug: s.sellers.slug,
      })
      .from(s.products)
      .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
      .leftJoin(s.sellers, eq(s.sellers.id, s.products.sellerId))
      .where(visible);

    // joined on "published" rather than an id list: D1 takes at most 100 values per statement
    const images = await db
      .select({ productId: s.productImages.productId, url: s.productImages.url })
      .from(s.productImages)
      .innerJoin(s.products, eq(s.products.id, s.productImages.productId))
      .where(visible)
      .orderBy(asc(s.productImages.productId), asc(s.productImages.sort));
    const links = await db
      .select({ productId: s.productCategories.productId, categoryId: s.productCategories.categoryId })
      .from(s.productCategories)
      .innerJoin(s.products, eq(s.products.id, s.productCategories.productId))
      .where(visible);
    const cats = await db
      .select({
        id: s.categories.id,
        parentId: s.categories.parentId,
        name: s.categories.name,
        slug: s.categories.slug,
        description: s.categories.description,
        image: s.categories.image,
        sort: s.categories.sort,
      })
      .from(s.categories)
      .where(eq(s.categories.isVisible, true))
      .orderBy(asc(s.categories.sort), asc(s.categories.name));
    const brands = await db
      .select({ id: s.brands.id, name: s.brands.name, slug: s.brands.slug, logo: s.brands.logo })
      .from(s.brands)
      .where(eq(s.brands.isVisible, true))
      .orderBy(asc(s.brands.sort), asc(s.brands.name));

    const imgs = new Map<number, string[]>();
    for (const i of images) {
      const list = imgs.get(i.productId) ?? [];
      list.push(i.url);
      imgs.set(i.productId, list);
    }
    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const parentOf = new Map(cats.map((c) => [c.id, c.parentId]));
    const prodCats = new Map<number, Set<number>>();
    for (const l of links) {
      const set = prodCats.get(l.productId) ?? new Set<number>();
      // a product in a child category also belongs to every ancestor
      let id: number | null | undefined = l.categoryId;
      while (id && !set.has(id)) {
        set.add(id);
        id = parentOf.get(id);
      }
      prodCats.set(l.productId, set);
    }

    const cards: Card[] = rows.map((r) => {
      const categoryIds = [...(prodCats.get(r.id) ?? [])];
      const list = imgs.get(r.id) ?? [];
      return {
        ...r,
        dealEndsAt: r.dealEndsAt ? r.dealEndsAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        image: list[0] ?? null,
        image2: list[1] ?? null,
        categoryIds,
        search: [r.name, r.sku, r.brand, ...categoryIds.map((c) => catName.get(c))]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });

    return { cards, cats, brands };
  },
  ["catalog-index-v2"],
  { tags: ["catalog"], revalidate: 3600 },
);

export async function getCatalog() {
  const { cards, cats, brands } = await getIndex();
  const counts = new Map<number, number>();
  for (const card of cards) for (const id of card.categoryIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const byId = new Map<number, Category>();
  for (const c of cats) byId.set(c.id, { ...c, count: counts.get(c.id) ?? 0, children: [] });
  const roots: Category[] = [];
  for (const c of byId.values()) {
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.children.push(c);
    else roots.push(c);
  }
  const brandCounts = new Map<string, number>();
  for (const card of cards) if (card.brandSlug) brandCounts.set(card.brandSlug, (brandCounts.get(card.brandSlug) ?? 0) + 1);

  return {
    cards,
    categories: [...byId.values()],
    tree: roots.filter((c) => c.count > 0),
    categoryBySlug: new Map([...byId.values()].map((c) => [c.slug, c])),
    brands: brands.map((b) => ({ ...b, count: brandCounts.get(b.slug) ?? 0 })).filter((b) => b.count > 0) as Brand[],
  };
}

// ---------------------------------------------------------------- listing

export type SortKey = "popular" | "newest" | "price-asc" | "price-desc" | "discount" | "relevance";

export type ListQuery = {
  seller?: string; // seller slug: one store's shelf
  q?: string;
  category?: string;
  brands?: string[];
  min?: number; // rupees
  max?: number;
  inStock?: boolean;
  deals?: boolean;
  minDiscount?: number;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export function discountOf(c: Pick<Card, "price" | "mrp">) {
  return c.mrp && c.mrp > c.price ? Math.round(((c.mrp - c.price) / c.mrp) * 100) : 0;
}

function relevance(card: Card, tokens: string[]) {
  const name = card.name.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (name.startsWith(t)) score += 5;
    if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) score += 3;
    else if (name.includes(t)) score += 2;
    else score += 1;
  }
  return score;
}

export async function listProducts(query: ListQuery) {
  const catalog = await getCatalog();
  const perPage = query.perPage ?? 24;
  let items = catalog.cards;

  const category = query.category ? catalog.categoryBySlug.get(query.category) : undefined;
  if (query.category && !category) return null;
  if (category) items = items.filter((c) => c.categoryIds.includes(category.id));
  if (query.seller) items = items.filter((c) => c.sellerSlug === query.seller);

  const tokens = (query.q ?? "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((t) => t.length > 0);
  if (tokens.length) items = items.filter((c) => tokens.every((t) => c.search.includes(t)));
  if (query.deals) items = items.filter((c) => c.isDeal || discountOf(c) >= 20);

  // facets are computed before the brand / price / stock filters narrow the list
  const facetBase = items;
  const brandFacet = new Map<string, { slug: string; name: string; count: number }>();
  for (const c of facetBase) {
    if (!c.brandSlug || !c.brand) continue;
    const f = brandFacet.get(c.brandSlug) ?? { slug: c.brandSlug, name: c.brand, count: 0 };
    f.count += 1;
    brandFacet.set(c.brandSlug, f);
  }
  const prices = facetBase.map((c) => c.price);
  const priceRange = prices.length ? { min: Math.floor(Math.min(...prices) / 100), max: Math.ceil(Math.max(...prices) / 100) } : { min: 0, max: 0 };

  if (query.brands?.length) items = items.filter((c) => c.brandSlug && query.brands!.includes(c.brandSlug));
  if (query.min) items = items.filter((c) => c.price >= query.min! * 100);
  if (query.max) items = items.filter((c) => c.price <= query.max! * 100);
  if (query.inStock) items = items.filter(inStock);
  if (query.minDiscount) items = items.filter((c) => discountOf(c) >= query.minDiscount!);

  const sort: SortKey = query.sort ?? (tokens.length ? "relevance" : "popular");
  const stockFirst = (a: Card, b: Card) => Number(inStock(b)) - Number(inStock(a));
  const sorters: Record<SortKey, (a: Card, b: Card) => number> = {
    relevance: (a, b) => stockFirst(a, b) || relevance(b, tokens) - relevance(a, tokens),
    popular: (a, b) =>
      stockFirst(a, b) ||
      Number(b.isFeatured) - Number(a.isFeatured) ||
      b.totalSales - a.totalSales ||
      b.createdAt.localeCompare(a.createdAt),
    newest: (a, b) => stockFirst(a, b) || b.createdAt.localeCompare(a.createdAt),
    "price-asc": (a, b) => stockFirst(a, b) || a.price - b.price,
    "price-desc": (a, b) => stockFirst(a, b) || b.price - a.price,
    discount: (a, b) => stockFirst(a, b) || discountOf(b) - discountOf(a),
  };
  items = [...items].sort(sorters[sort]);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    pages,
    sort,
    category: category ?? null,
    brandFacet: [...brandFacet.values()].sort((a, b) => b.count - a.count),
    priceRange,
    catalog,
  };
}

export async function getCards(opts: { category?: string; limit?: number; deals?: boolean; exclude?: number[]; slugs?: string[] }) {
  if (opts.slugs) {
    const { cards } = await getCatalog();
    const bySlug = new Map(cards.map((c) => [c.slug, c]));
    return opts.slugs.map((slug) => bySlug.get(slug)).filter((c): c is Card => !!c);
  }
  const res = await listProducts({ category: opts.category, deals: opts.deals, perPage: (opts.limit ?? 10) + (opts.exclude?.length ?? 0) });
  if (!res) return [];
  return res.items.filter((c) => !opts.exclude?.includes(c.id)).slice(0, opts.limit ?? 10);
}

export async function getDeals(limit = 12) {
  const { cards } = await getCatalog();
  const now = Date.now();
  return cards
    .filter((c) => c.isDeal && (!c.dealEndsAt || new Date(c.dealEndsAt).getTime() > now))
    .concat(cards.filter((c) => !c.isDeal && inStock(c) && discountOf(c) >= 25))
    .sort((a, b) => Number(inStock(b)) - Number(inStock(a)) || Number(b.isDeal) - Number(a.isDeal) || discountOf(b) - discountOf(a))
    .slice(0, limit);
}

export async function searchSuggest(q: string, limit = 6) {
  const res = await listProducts({ q, perPage: limit });
  if (!res) return { products: [], categories: [] };
  const needle = q.toLowerCase();
  return {
    products: res.items.map((c) => ({ slug: c.slug, name: c.name, price: c.price, image: c.image, inStock: inStock(c) })),
    categories: res.catalog.categories
      .filter((c) => c.count > 0 && c.name.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((c) => ({ slug: c.slug, name: c.name, count: c.count })),
  };
}

// ---------------------------------------------------------------- product page

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  sku: string | null;
  price: number;
  mrp: number | null;
  stockStatus: string;
  stockQty: number | null;
  maxPerOrder: number | null;
  highlights: string[];
  specs: SpecGroup[];
  descriptionHtml: string;
  badge: string | null;
  isDeal: boolean;
  dealEndsAt: string | null;
  dealQuantity: number | null;
  dealSold: number;
  gstRate: number;
  warranty: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ratingAvg: number;
  ratingCount: number;
  brand: { name: string; slug: string } | null;
  seller: { name: string; slug: string; city: string | null } | null;
  images: { url: string; alt: string | null; width: number | null; height: number | null }[];
  categoryIds: number[];
  reviews: { id: number; name: string; rating: number; title: string | null; body: string; isVerified: boolean; adminReply: string | null; createdAt: string }[];
};

export const getProduct = unstable_cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const [p] = await db
      .select()
      .from(s.products)
      .where(and(eq(s.products.slug, slug), visible));
    if (!p) return null;
    const [seller] = p.sellerId ? await db.select({ name: s.sellers.storeName, slug: s.sellers.slug, city: s.sellers.city }).from(s.sellers).where(eq(s.sellers.id, p.sellerId)) : [];
    const [brand] = p.brandId ? await db.select({ name: s.brands.name, slug: s.brands.slug }).from(s.brands).where(eq(s.brands.id, p.brandId)) : [];
    const images = await db
      .select({ url: s.productImages.url, alt: s.productImages.alt, width: s.productImages.width, height: s.productImages.height })
      .from(s.productImages)
      .where(eq(s.productImages.productId, p.id))
      .orderBy(asc(s.productImages.sort));
    const cats = await db.select({ id: s.productCategories.categoryId }).from(s.productCategories).where(eq(s.productCategories.productId, p.id));
    const reviews = await db
      .select({
        id: s.reviews.id,
        name: s.reviews.name,
        rating: s.reviews.rating,
        title: s.reviews.title,
        body: s.reviews.body,
        isVerified: s.reviews.isVerified,
        adminReply: s.reviews.adminReply,
        createdAt: s.reviews.createdAt,
      })
      .from(s.reviews)
      .where(and(eq(s.reviews.productId, p.id), eq(s.reviews.status, "approved")))
      .orderBy(desc(s.reviews.createdAt))
      .limit(50);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      price: p.price,
      mrp: p.mrp,
      stockStatus: p.stockStatus,
      stockQty: p.stockQty,
      maxPerOrder: p.maxPerOrder,
      highlights: p.highlights,
      specs: p.specs,
      descriptionHtml: p.descriptionHtml,
      badge: p.badge,
      isDeal: p.isDeal,
      dealEndsAt: p.dealEndsAt?.toISOString() ?? null,
      dealQuantity: p.dealQuantity,
      dealSold: p.dealSold,
      gstRate: p.gstRate,
      warranty: p.warranty,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      brand: brand ?? null,
      seller: seller ?? null,
      images,
      categoryIds: cats.map((c) => c.id),
      reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    };
  },
  ["product-v2"],
  { tags: ["catalog"], revalidate: 3600 },
);

/** Category trail for breadcrumbs: deepest category of the product, walked up to the root. */
export async function getTrail(categoryIds: number[]) {
  const { categories } = await getCatalog();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const depth = (c: Category) => {
    let d = 0;
    let p = c.parentId ? byId.get(c.parentId) : undefined;
    while (p) {
      d += 1;
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
    return d;
  };
  const deepest = categoryIds
    .map((id) => byId.get(id))
    .filter((c): c is Category => !!c)
    .sort((a, b) => depth(b) - depth(a))[0];
  const trail: Category[] = [];
  let cur: Category | undefined = deepest;
  while (cur) {
    trail.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return trail;
}

// ---------------------------------------------------------------- content

export const getBanners = unstable_cache(
  async () => {
    const rows = await db.select().from(s.banners).where(eq(s.banners.isActive, true)).orderBy(asc(s.banners.sort), asc(s.banners.id));
    const now = Date.now();
    return rows
      .filter((b) => (!b.startsAt || b.startsAt.getTime() <= now) && (!b.endsAt || b.endsAt.getTime() > now))
      .map((b) => ({ ...b, startsAt: b.startsAt?.toISOString() ?? null, endsAt: b.endsAt?.toISOString() ?? null, createdAt: b.createdAt.toISOString() }));
  },
  ["banners-v1"],
  { tags: ["content"], revalidate: 600 },
);

export const getPage = unstable_cache(
  async (slug: string) => {
    const [p] = await db.select().from(s.pages).where(and(eq(s.pages.slug, slug), eq(s.pages.isPublished, true)));
    return p ? { ...p, updatedAt: p.updatedAt.toISOString() } : null;
  },
  ["page-v1"],
  { tags: ["content"], revalidate: 3600 },
);

export const getFooterPages = unstable_cache(
  async () =>
    db
      .select({ slug: s.pages.slug, title: s.pages.title })
      .from(s.pages)
      .where(and(eq(s.pages.isPublished, true), eq(s.pages.showInFooter, true)))
      .orderBy(asc(s.pages.sort)),
  ["footer-pages-v1"],
  { tags: ["content"], revalidate: 3600 },
);

export async function getSpecsForCompare(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await db
    .select({ slug: s.products.slug, specs: s.products.specs, highlights: s.products.highlights, warranty: s.products.warranty })
    .from(s.products)
    .where(and(inArray(s.products.slug, slugs.slice(0, 4)), visible));
  return rows;
}
