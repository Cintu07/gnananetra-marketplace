import { count, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_COMMISSION_PCT, sellerEarnings } from "@/lib/marketplace";
import SellersView from "@/components/admin/views/sellers-view";

export const metadata = { title: "Sellers" };

export default async function SellersPage() {
  const admin = await requireAdmin();
  const rows = await db
    .select({ seller: s.sellers, email: s.users.email, name: s.users.name })
    .from(s.sellers)
    .innerJoin(s.users, eq(s.users.id, s.sellers.userId))
    .orderBy(sql`case ${s.sellers.status} when 'pending' then 0 when 'approved' then 1 else 2 end`, s.sellers.createdAt);
  const out = [];
  for (const r of rows) {
    const [{ products }] = await db.select({ products: count() }).from(s.products).where(eq(s.products.sellerId, r.seller.id));
    const money = await sellerEarnings(r.seller.id);
    out.push({
      id: r.seller.id,
      storeName: r.seller.storeName,
      slug: r.seller.slug,
      owner: r.name,
      email: r.email,
      phone: r.seller.phone,
      city: [r.seller.city, r.seller.state].filter(Boolean).join(", "),
      gstin: r.seller.gstin,
      about: r.seller.about,
      pickupAddress: r.seller.pickupAddress,
      status: r.seller.status,
      commissionPct: r.seller.commissionPct,
      rejectionReason: r.seller.rejectionReason,
      createdAt: r.seller.createdAt.toISOString(),
      products,
      sold: money.delivered.gross + money.inProgress.gross,
      balance: money.balance,
      paid: money.paid,
    });
  }
  return <SellersView rows={out} defaultPct={DEFAULT_COMMISSION_PCT} isOwner={admin.role === "admin"} />;
}
