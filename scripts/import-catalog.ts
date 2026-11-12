// npm run import             load / refresh the shop catalogue and starter content
//
// Reads data/catalog/*.json (brands, categories, products with photos, policy pages) and writes them
// into the LOCAL D1 database (npm run db first). Safe to run again: rows are matched by slug.
// Also creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, default settings, the FAQ page and
// starter homepage banners (only when those are missing). It never touches customers or orders.
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import * as s from "../db/schema";
import { hashPassword } from "../lib/password";
import { DEFAULT_SETTINGS } from "../lib/settings-defaults";
import { openLocal } from "./local-d1";

const ROOT = process.cwd();
const read = <T>(rel: string): T | null => {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : null;
};

const local = openLocal();
const db = local.db;

type CatCategory = { wp_id: number; name: string; slug: string; parent_slug: string | null; description: string; image: string | null; sort: number };
type CatBrand = { wp_id: number; name: string; slug: string; image: string | null };
type CatProduct = {
  wp_id: number;
  slug: string;
  name: string;
  sku: string | null;
  status: string;
  brand_slug: string | null;
  category_slugs: string[];
  price: number;
  mrp: number | null;
  in_stock: boolean;
  stock_qty: number | null;
  highlights: string[];
  specs: s.SpecGroup[];
  description_html: string;
  images: { src: string; file: string | null; alt: string }[];
  is_deal: boolean;
  deal_quantity: number | null;
  deal_sold: number;
  badge: string | null;
  featured: boolean;
  total_sales: number;
  weight_kg: number | null;
  created_at: string;
};
async function importCatalogue() {
  const cats = read<CatCategory[]>("data/catalog/categories.json") ?? [];
  const brands = read<CatBrand[]>("data/catalog/brands.json") ?? [];
  const products = read<CatProduct[]>("data/catalog/products.json") ?? [];
  const imageMap = read<Record<string, { url: string; width: number; height: number }>>("data/catalog/image-map.json") ?? {};

  for (const b of brands) {
    await db
      .insert(s.brands)
      .values({ name: b.name, slug: b.slug, logo: b.image, wpId: b.wp_id })
      .onConflictDoUpdate({ target: s.brands.slug, set: { name: b.name, wpId: b.wp_id } });
  }
  for (const c of cats) {
    await db
      .insert(s.categories)
      .values({ name: c.name, slug: c.slug, description: c.description || null, image: c.image, sort: c.sort, wpId: c.wp_id })
      .onConflictDoUpdate({ target: s.categories.slug, set: { name: c.name, sort: c.sort, wpId: c.wp_id } });
  }
  const catRows = await db.select({ id: s.categories.id, slug: s.categories.slug }).from(s.categories);
  const catId = new Map(catRows.map((r) => [r.slug, r.id]));
  for (const c of cats) {
    await db
      .update(s.categories)
      .set({ parentId: c.parent_slug ? (catId.get(c.parent_slug) ?? null) : null })
      .where(eq(s.categories.slug, c.slug));
  }
  const brandRows = await db.select({ id: s.brands.id, slug: s.brands.slug }).from(s.brands);
  const brandId = new Map(brandRows.map((r) => [r.slug, r.id]));

  let n = 0;
  for (const p of products) {
    const values = {
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      brandId: p.brand_slug ? (brandId.get(p.brand_slug) ?? null) : null,
      status: p.status,
      price: p.price,
      mrp: p.mrp,
      stockStatus: p.in_stock ? "in_stock" : "out_of_stock",
      stockQty: p.stock_qty,
      highlights: p.highlights,
      specs: p.specs,
      descriptionHtml: p.description_html,
      badge: p.badge,
      isFeatured: p.featured,
      isDeal: p.is_deal,
      dealQuantity: p.deal_quantity,
      dealSold: p.deal_sold,
      totalSales: p.total_sales,
      weightKg: p.weight_kg,
      wpId: p.wp_id,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(s.products)
      .values(values)
      .onConflictDoUpdate({ target: s.products.slug, set: { ...values, createdAt: undefined } })
      .returning({ id: s.products.id });

    await db.delete(s.productImages).where(eq(s.productImages.productId, row.id));
    const imgs = p.images
      .map((img, i) => {
        const local = imageMap[img.src];
        return { productId: row.id, url: local?.url ?? img.src, alt: img.alt, sort: i, width: local?.width ?? null, height: local?.height ?? null };
      })
      .filter((x) => x.url);
    if (imgs.length) await db.insert(s.productImages).values(imgs);

    await db.delete(s.productCategories).where(eq(s.productCategories.productId, row.id));
    const links = [...new Set(p.category_slugs)].map((slug) => catId.get(slug)).filter((x): x is number => !!x);
    if (links.length) await db.insert(s.productCategories).values(links.map((categoryId) => ({ productId: row.id, categoryId })));
    n += 1;
  }
  console.log(`catalogue: ${brands.length} brands, ${cats.length} categories, ${n} products`);
}

async function importPages() {
  const pages = read<{ slug: string; title: string; content_html: string }[]>("data/catalog/pages.json") ?? [];
  const all = [...pages.map((p, i) => ({ ...p, sort: i + 1 })), { slug: "faqs", title: "Frequently asked questions", content_html: FAQ_HTML, sort: 0 }];
  for (const p of all) {
    await db
      .insert(s.pages)
      .values({ slug: p.slug, title: p.title, contentHtml: p.content_html, sort: p.sort })
      .onConflictDoNothing({ target: s.pages.slug });
  }
  console.log(`pages: ${all.length} (existing pages are left as they are)`);
}

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return console.log("admin: ADMIN_EMAIL / ADMIN_PASSWORD not set, skipped");
  const hash = await hashPassword(password);
  const [found] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
  if (found) {
    await db.update(s.users).set({ role: "admin", passwordHash: hash, isBlocked: false }).where(eq(s.users.id, found.id));
  } else {
    await db.insert(s.users).values({ email, name: "Store admin", role: "admin", passwordHash: hash, source: "admin" });
  }
  console.log(`admin: ${email} ready`);
}

async function ensureSettingsAndContent() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(s.settings).values({ key, value }).onConflictDoNothing({ target: s.settings.key });
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(s.banners);
  if (count === 0) {
    const pick = async (slug: string) => {
      const [p] = await db
        .select({ url: s.productImages.url })
        .from(s.productImages)
        .innerJoin(s.products, eq(s.products.id, s.productImages.productId))
        .where(and(eq(s.products.slug, slug), eq(s.productImages.sort, 0)));
      return p?.url ?? null;
    };
    const first = async (category: string) => {
      const [p] = await db
        .select({ slug: s.products.slug })
        .from(s.products)
        .innerJoin(s.productCategories, eq(s.productCategories.productId, s.products.id))
        .innerJoin(s.categories, eq(s.categories.id, s.productCategories.categoryId))
        .where(and(eq(s.categories.slug, category), eq(s.products.status, "published")))
        .orderBy(sql`case when ${s.products.stockStatus} = 'in_stock' then 0 else 1 end`, desc(s.products.price))
        .limit(1);
      return p ? pick(p.slug) : null;
    };
    await db.insert(s.banners).values([
      {
        placement: "hero",
        eyebrow: "Office printing",
        title: "Printers that keep your office moving",
        subtitle: "Laser, ink tank and multifunction printers from HP, Epson, Brother, Canon and Pantum.",
        ctaLabel: "Shop printers",
        ctaHref: "/category/printer",
        image: await first("multifunction-machine-mfm-v2"),
        theme: "dark",
        sort: 1,
      },
      {
        placement: "hero",
        eyebrow: "Computers",
        title: "Laptops and desktops for work that matters",
        subtitle: "Business laptops, all-in-one PCs and towers, with GST invoice and doorstep delivery.",
        ctaLabel: "Explore computers",
        ctaHref: "/category/desktops",
        image: await first("all-in-one-pc"),
        theme: "brand",
        sort: 2,
      },
      {
        placement: "hero",
        eyebrow: "Beat the heat",
        title: "Inverter ACs at our best prices",
        subtitle: "Energy-efficient split ACs from Voltas, Blue Star and Acerpure.",
        ctaLabel: "Shop air conditioners",
        ctaHref: "/category/air-conditioner",
        image: await first("air-conditioner"),
        theme: "light",
        sort: 3,
      },
      { placement: "promo", eyebrow: "Power backup", title: "UPS for every desk", subtitle: "Line interactive UPS from 0.6 to 2 KVA", ctaLabel: "Shop UPS", ctaHref: "/category/line-interactive-ups", image: await first("line-interactive-ups"), theme: "light", sort: 1 },
      { placement: "promo", eyebrow: "For businesses", title: "Buying in bulk?", subtitle: "Get a quote for offices, schools and institutions", ctaLabel: "Request a quote", ctaHref: "/contact?topic=bulk", image: await first("desktops"), theme: "dark", sort: 2 },
    ]);
    console.log("banners: starter homepage slides created");
  }
}

const FAQ_HTML = `
<h3>Orders and delivery</h3>
<h4>How soon will my order ship?</h4>
<p>Once an order is placed and verified we usually process and dispatch it within 1 to 3 working days. Delivery time depends on the destination, product availability and the courier.</p>
<h4>Do you deliver across India?</h4>
<p>Yes. We deliver across India through reliable courier and logistics partners. You will get tracking details by email or SMS once your order ships.</p>
<h4>How do I track my order?</h4>
<p>Use the <a href="/track">Track order</a> page with your order number and the email or phone number you ordered with, or open My account if you have one.</p>
<h3>Payments and invoices</h3>
<h4>How can I pay?</h4>
<p>You can pay online with UPI, debit or credit cards and net banking. Cash on delivery is available on eligible orders.</p>
<h4>Will I get an invoice?</h4>
<p>Yes, every order comes with an invoice. Add your company name and GSTIN at checkout and they will be printed on it.</p>
<h3>Returns and cancellations</h3>
<h4>What if my product arrives damaged or wrong?</h4>
<p>Tell us within 48 hours of delivery with a photo or video. After verification we arrange a return or replacement. Products must be unused, in the original packaging and with the invoice.</p>
<h4>Can I cancel my order?</h4>
<p>Orders can be cancelled before dispatch. Once an order has shipped it cannot be cancelled.</p>
<h4>When will I get my refund?</h4>
<p>Eligible refunds are processed to the original payment method within 5 to 7 working days.</p>
<h3>Business purchases</h3>
<h4>Do you supply offices and institutions in bulk?</h4>
<p>Yes. We work with businesses and institutions with competitive pricing and flexible order quantities. <a href="/contact?topic=bulk">Request a bulk quote</a> and our team will get back to you.</p>
`.trim();

await importCatalogue();
await importPages();
await ensureAdmin();
await ensureSettingsAndContent();
local.close();
console.log("import finished");
