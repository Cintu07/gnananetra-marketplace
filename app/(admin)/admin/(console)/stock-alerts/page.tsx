import { desc, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import StockAlertsView from "@/components/admin/views/stock-alerts-view";

export const metadata = { title: "Stock alerts" };

export default async function StockAlertsPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: s.stockAlerts.id,
      email: s.stockAlerts.email,
      createdAt: s.stockAlerts.createdAt,
      productId: s.products.id,
      productName: s.products.name,
      productSlug: s.products.slug,
      stockStatus: s.products.stockStatus,
      status: s.products.status,
    })
    .from(s.stockAlerts)
    .innerJoin(s.products, eq(s.products.id, s.stockAlerts.productId))
    .where(isNull(s.stockAlerts.notifiedAt))
    .orderBy(desc(s.stockAlerts.createdAt));
  return <StockAlertsView rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
