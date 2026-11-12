import { notFound } from "next/navigation";
import { count, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getOrderFull } from "@/lib/orders";
import { razorpayLive } from "@/lib/razorpay";
import OrderDetail from "@/components/admin/views/order-detail";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const order = await getOrderFull({ id });
  if (!order) notFound();
  const [orderCount] = order.userId ? await db.select({ n: count() }).from(s.orders).where(eq(s.orders.userId, order.userId)) : [{ n: 0 }];
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  const sellerIds = [...new Set(order.items.map((i) => i.sellerId).filter((x): x is number => x !== null))];
  const sellerNames = new Map((sellerIds.length ? await db.select({ id: s.sellers.id, name: s.sellers.storeName }).from(s.sellers).where(inArray(s.sellers.id, sellerIds)) : []).map((r) => [r.id, r.name]));
  return (
    <OrderDetail
      order={{
        ...order,
        items: order.items.map((i) => ({ ...i, sellerName: i.sellerId ? (sellerNames.get(i.sellerId) ?? null) : null })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        paidAt: iso(order.paidAt),
        shippedAt: iso(order.shippedAt),
        deliveredAt: iso(order.deliveredAt),
        cancelledAt: iso(order.cancelledAt),
        events: order.events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      }}
      customerOrders={orderCount?.n ?? 0}
      gatewayLive={razorpayLive()}
    />
  );
}
