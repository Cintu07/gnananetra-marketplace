import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import ReviewsView from "@/components/admin/views/reviews-view";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: s.reviews.id,
      name: s.reviews.name,
      email: s.reviews.email,
      rating: s.reviews.rating,
      title: s.reviews.title,
      body: s.reviews.body,
      status: s.reviews.status,
      isVerified: s.reviews.isVerified,
      adminReply: s.reviews.adminReply,
      createdAt: s.reviews.createdAt,
      productId: s.reviews.productId,
      productName: s.products.name,
      productSlug: s.products.slug,
    })
    .from(s.reviews)
    .innerJoin(s.products, eq(s.products.id, s.reviews.productId))
    .orderBy(desc(s.reviews.createdAt));
  return <ReviewsView rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
