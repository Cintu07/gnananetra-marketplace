import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import ProductForm, { type ProductFormValue } from "@/components/admin/views/product-form";

export const metadata = { title: "Edit product" };

async function loadOptions() {
  const categories = await db.select({ id: s.categories.id, name: s.categories.name, parentId: s.categories.parentId }).from(s.categories).orderBy(asc(s.categories.sort), asc(s.categories.name));
  const brands = await db.select({ id: s.brands.id, name: s.brands.name }).from(s.brands).orderBy(asc(s.brands.name));
  return { categories, brands };
}

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: raw } = await params;
  if (raw === "new") return <NewProduct />;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p) notFound();
  const images = await db.select().from(s.productImages).where(eq(s.productImages.productId, id)).orderBy(asc(s.productImages.sort));
  const cats = await db.select({ id: s.productCategories.categoryId }).from(s.productCategories).where(eq(s.productCategories.productId, id));
  const [{ alerts }] = await db.all<{ alerts: number }>(sql`select count(*) as alerts from stock_alerts where product_id = ${id} and notified_at is null`);
  const value: ProductFormValue = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brandId: p.brandId,
    categoryIds: cats.map((c) => c.id),
    status: p.status as ProductFormValue["status"],
    price: p.price,
    mrp: p.mrp,
    costPrice: p.costPrice,
    stockStatus: p.stockStatus as ProductFormValue["stockStatus"],
    stockQty: p.stockQty,
    lowStockAt: p.lowStockAt,
    maxPerOrder: p.maxPerOrder,
    highlights: p.highlights,
    specs: p.specs,
    descriptionHtml: p.descriptionHtml,
    badge: p.badge,
    isFeatured: p.isFeatured,
    isDeal: p.isDeal,
    dealEndsAt: p.dealEndsAt ? p.dealEndsAt.toISOString() : null,
    dealQuantity: p.dealQuantity,
    gstRate: p.gstRate,
    hsn: p.hsn,
    warranty: p.warranty,
    weightKg: p.weightKg,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    images: images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
  };
  return <ProductForm initial={value} {...await loadOptions()} meta={{ totalSales: p.totalSales, rating: p.ratingAvg, ratingCount: p.ratingCount, alerts, wpId: p.wpId }} />;
}

async function NewProduct() {
  return <ProductForm initial={null} {...await loadOptions()} meta={null} />;
}
