import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { expireStaleOrders } from "@/lib/orders";
import OrdersView from "@/components/admin/views/orders-view";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requireAdmin();
  await expireStaleOrders();
  const { view, q } = await searchParams;
  const rows = await db
    .select({
      id: s.orders.id,
      number: s.orders.number,
      name: s.orders.name,
      email: s.orders.email,
      phone: s.orders.phone,
      status: s.orders.status,
      paymentMethod: s.orders.paymentMethod,
      paymentStatus: s.orders.paymentStatus,
      total: s.orders.total,
      source: s.orders.source,
      city: sql<string | null>`json_extract(${s.orders.shippingAddress}, '$.city')`,
      createdAt: s.orders.createdAt,
      items: sql<number>`(select coalesce(sum(qty), 0) from order_items where order_id = "orders"."id")`,
    })
    .from(s.orders)
    .orderBy(desc(s.orders.createdAt))
    .limit(2000);
  return <OrdersView rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} initialView={view ?? "all"} initialQuery={q ?? ""} />;
}
