import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import PagesView from "@/components/admin/views/pages-view";

export const metadata = { title: "Pages" };

export default async function PagesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin();
  const { edit } = await searchParams;
  const rows = await db.select().from(s.pages).orderBy(asc(s.pages.sort), asc(s.pages.title));
  return <PagesView rows={rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))} editId={edit === "new" ? 0 : edit ? Number(edit) : null} />;
}
