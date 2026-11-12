import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import BannersView from "@/components/admin/views/banners-view";

export const metadata = { title: "Homepage banners" };

export default async function BannersPage() {
  await requireAdmin();
  const rows = await db.select().from(s.banners).orderBy(asc(s.banners.placement), asc(s.banners.sort), asc(s.banners.id));
  return <BannersView rows={rows.map((r) => ({ ...r, startsAt: r.startsAt?.toISOString() ?? null, endsAt: r.endsAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }))} />;
}
