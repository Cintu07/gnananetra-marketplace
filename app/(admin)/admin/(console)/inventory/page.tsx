import { asc, eq, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import InventoryView from "@/components/admin/views/inventory-view";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: s.products.id,
      name: s.products.name,
      sku: s.products.sku,
      status: s.products.status,
      stockStatus: s.products.stockStatus,
      stockQty: s.products.stockQty,
      lowStockAt: s.products.lowStockAt,
      brand: s.brands.name,
      image: sql<string | null>`(select url from product_images where product_id = "products"."id" order by sort limit 1)`,
      waiting: sql<number>`(select count(*) from stock_alerts where product_id = "products"."id" and notified_at is null)`,
    })
    .from(s.products)
    .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .where(ne(s.products.status, "archived"))
    .orderBy(asc(s.products.name));
  return <InventoryView rows={rows} />;
}
