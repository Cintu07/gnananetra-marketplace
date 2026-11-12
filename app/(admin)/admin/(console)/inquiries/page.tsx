import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import InquiriesView from "@/components/admin/views/inquiries-view";

export const metadata = { title: "Inquiries" };

export default async function InquiriesPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: s.inquiries.id,
      kind: s.inquiries.kind,
      name: s.inquiries.name,
      email: s.inquiries.email,
      phone: s.inquiries.phone,
      company: s.inquiries.company,
      subject: s.inquiries.subject,
      message: s.inquiries.message,
      quantity: s.inquiries.quantity,
      status: s.inquiries.status,
      adminNote: s.inquiries.adminNote,
      createdAt: s.inquiries.createdAt,
      productName: s.products.name,
      productId: s.inquiries.productId,
    })
    .from(s.inquiries)
    .leftJoin(s.products, eq(s.products.id, s.inquiries.productId))
    .orderBy(desc(s.inquiries.createdAt));
  return <InquiriesView rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
