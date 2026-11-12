import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminOrNull } from "@/lib/auth";

// Sidebar badges and the notification bell. One round trip.
export async function GET() {
  if (!(await adminOrNull())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const rows = await db.all<{ orders_to_ship: number; inquiries_new: number; reviews_pending: number; low_stock: number; stock_alerts: number; sellers_pending: number }>(sql`
    select
      (select count(*) from orders where status in ('processing', 'packed')) as orders_to_ship,
      (select count(*) from inquiries where status = 'new') as inquiries_new,
      (select count(*) from reviews where status = 'pending') as reviews_pending,
      (select count(*) from products where status = 'published' and stock_qty is not null and stock_qty <= low_stock_at) as low_stock,
      (select count(*) from stock_alerts where notified_at is null) as stock_alerts,
      (select count(*) from sellers where status = 'pending') as sellers_pending`);
  return NextResponse.json({ data: rows[0] });
}
