import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { adminOrNull } from "@/lib/auth";

// Orders and addresses for the customer slide-over (loaded when it opens).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOrNull())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const id = Number((await params).id);
  const orders = await db
    .select({ id: s.orders.id, number: s.orders.number, status: s.orders.status, total: s.orders.total, createdAt: s.orders.createdAt, paymentMethod: s.orders.paymentMethod })
    .from(s.orders)
    .where(eq(s.orders.userId, id))
    .orderBy(desc(s.orders.createdAt));
  const addresses = await db.select().from(s.addresses).where(eq(s.addresses.userId, id)).orderBy(desc(s.addresses.isDefault), asc(s.addresses.id));
  return NextResponse.json({ data: { orders, addresses } });
}
