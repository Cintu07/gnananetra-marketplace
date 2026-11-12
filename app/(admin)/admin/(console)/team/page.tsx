import { asc, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import TeamView from "@/components/admin/views/team-view";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdmin({ owner: true });
  const rows = await db
    .select({ id: s.users.id, name: s.users.name, email: s.users.email, role: s.users.role, lastLoginAt: s.users.lastLoginAt, createdAt: s.users.createdAt })
    .from(s.users)
    .where(inArray(s.users.role, ["admin", "staff"]))
    .orderBy(asc(s.users.createdAt));
  return <TeamView meId={me.id} rows={rows.map((r) => ({ ...r, lastLoginAt: r.lastLoginAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }))} />;
}
