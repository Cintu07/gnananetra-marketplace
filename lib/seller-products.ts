import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { Initial } from "@/components/seller/ProductForm";

/** Categories as a flat, indented list for the product form's dropdown. */
export async function categoryOptions() {
  const rows = await db.select({ id: s.categories.id, name: s.categories.name, parentId: s.categories.parentId }).from(s.categories).where(eq(s.categories.isVisible, true)).orderBy(asc(s.categories.sort), asc(s.categories.name));
  const out: { id: number; name: string; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const c of rows.filter((r) => r.parentId === parent)) {
      out.push({ id: c.id, name: c.name, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

const rupeesText = (paise: number | null) => (paise ? String(paise / 100) : "");

export const emptyProduct: Initial = {
  name: "",
  categoryId: null,
  price: "",
  mrp: "",
  stockQty: "1",
  sku: "",
  gstRate: 18,
  hsn: "",
  warranty: "",
  highlights: [""],
  description: "",
  images: [],
  status: "published",
};

export async function loadProduct(id: number, sellerId: number): Promise<Initial | null> {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p || p.sellerId !== sellerId) return null;
  const images = await db.select({ url: s.productImages.url, width: s.productImages.width, height: s.productImages.height }).from(s.productImages).where(eq(s.productImages.productId, id)).orderBy(asc(s.productImages.sort));
  const [cat] = await db.select({ id: s.productCategories.categoryId }).from(s.productCategories).where(eq(s.productCategories.productId, id));
  const text = p.descriptionHtml
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return {
    id: p.id,
    name: p.name,
    categoryId: cat?.id ?? null,
    price: rupeesText(p.price),
    mrp: rupeesText(p.mrp),
    stockQty: String(p.stockQty ?? 0),
    sku: p.sku ?? "",
    gstRate: p.gstRate,
    hsn: p.hsn ?? "",
    warranty: p.warranty ?? "",
    highlights: p.highlights.length ? p.highlights : [""],
    description: text,
    images,
    status: p.status === "published" ? "published" : "draft",
  };
}
