import { asc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import BrandsView from "@/components/admin/views/brands-view";

export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: s.brands.id,
      name: s.brands.name,
      slug: s.brands.slug,
      logo: s.brands.logo,
      isVisible: s.brands.isVisible,
      sort: s.brands.sort,
      products: sql<number>`(select count(*) from products where brand_id = "brands"."id" and status = 'published')`,
    })
    .from(s.brands)
    .orderBy(asc(s.brands.sort), asc(s.brands.name));
  return <BrandsView rows={rows} />;
}
