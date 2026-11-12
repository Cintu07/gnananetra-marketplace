import { desc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import CouponsView from "@/components/admin/views/coupons-view";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  await requireAdmin();
  const rows = await db.select().from(s.coupons).orderBy(desc(s.coupons.createdAt));
  return (
    <CouponsView
      rows={rows.map((r) => ({ ...r, startsAt: r.startsAt?.toISOString() ?? null, endsAt: r.endsAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }))}
    />
  );
}
