import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import CustomersView from "@/components/admin/views/customers-view";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  await requireAdmin();
  const { open } = await searchParams;
  const rows = await db
    .select({
      id: s.users.id,
      name: s.users.name,
      email: s.users.email,
      phone: s.users.phone,
      source: s.users.source,
      notes: s.users.notes,
      tags: s.users.tags,
      isBlocked: s.users.isBlocked,
      hasPassword: sql<boolean>`${s.users.passwordHash} is not null`,
      createdAt: s.users.createdAt,
      lastLoginAt: s.users.lastLoginAt,
      orders: sql<number>`(select count(*) from orders where user_id = "users"."id")`,
      spent: sql<number>`(select coalesce(sum(total - refunded_amount), 0) from orders where user_id = "users"."id" and status not in ('cancelled','failed','pending','refunded'))`,
      lastOrderAt: sql<string | null>`(select max(created_at) from orders where user_id = "users"."id")`.mapWith((ms: number | null) => (ms ? new Date(ms).toISOString() : null)),
      city: sql<string | null>`(select city from addresses where user_id = "users"."id" order by is_default desc, id limit 1)`,
    })
    .from(s.users)
    .where(eq(s.users.role, "customer"))
    .orderBy(desc(s.users.createdAt));
  return (
    <CustomersView
      rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), lastLoginAt: r.lastLoginAt?.toISOString() ?? null }))}
      openId={open ? Number(open) : null}
    />
  );
}
