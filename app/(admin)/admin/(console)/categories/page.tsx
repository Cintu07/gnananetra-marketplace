import { asc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import CategoriesView from "@/components/admin/views/categories-view";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: s.categories.id,
      name: s.categories.name,
      slug: s.categories.slug,
      parentId: s.categories.parentId,
      description: s.categories.description,
      image: s.categories.image,
      sort: s.categories.sort,
      isVisible: s.categories.isVisible,
      products: sql<number>`(select count(*) from product_categories pc join products p on p.id = pc.product_id where pc.category_id = "categories"."id" and p.status = 'published')`,
    })
    .from(s.categories)
    .orderBy(asc(s.categories.sort), asc(s.categories.name));
  return <CategoriesView rows={rows} />;
}
