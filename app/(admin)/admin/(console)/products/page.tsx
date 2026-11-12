import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import ProductsView from "@/components/admin/views/products-view";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requireAdmin();
  const { view, q } = await searchParams;
  const rows = await db
    .select({
      id: s.products.id,
      slug: s.products.slug,
      name: s.products.name,
      sku: s.products.sku,
      status: s.products.status,
      price: s.products.price,
      mrp: s.products.mrp,
      stockStatus: s.products.stockStatus,
      stockQty: s.products.stockQty,
      lowStockAt: s.products.lowStockAt,
      isFeatured: s.products.isFeatured,
      isDeal: s.products.isDeal,
      totalSales: s.products.totalSales,
      updatedAt: s.products.updatedAt,
      brand: s.brands.name,
      seller: s.sellers.storeName,
      brandId: s.products.brandId,
      image: sql<string | null>`(select url from product_images where product_id = "products"."id" order by sort limit 1)`,
      categoryIds: sql<number[]>`(select json_group_array(category_id) from product_categories where product_id = "products"."id")`.mapWith((v: string | null) => JSON.parse(v ?? "[]") as number[]),
      alerts: sql<number>`(select count(*) from stock_alerts where product_id = "products"."id" and notified_at is null)`,
    })
    .from(s.products)
    .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .leftJoin(s.sellers, eq(s.sellers.id, s.products.sellerId))
    // newest first and fixed: sorting by "last updated" made a row jump to the top when edited
    .orderBy(desc(s.products.id));
  const categories = await db.select({ id: s.categories.id, name: s.categories.name, parentId: s.categories.parentId }).from(s.categories).orderBy(asc(s.categories.sort), asc(s.categories.name));
  const brands = await db.select({ id: s.brands.id, name: s.brands.name }).from(s.brands).orderBy(asc(s.brands.name));
  return (
    <ProductsView
      rows={rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString(), categoryIds: (r.categoryIds ?? []).map(Number) }))}
      categories={categories}
      brands={brands}
      initialView={view ?? "all"}
      initialQuery={q ?? ""}
    />
  );
}
