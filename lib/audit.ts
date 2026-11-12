import "server-only";
import { db, schema } from "@/lib/db";

// One line per admin change, shown under Admin > Activity.
export async function logActivity(
  actor: { id: number; name: string; email: string | null } | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  summary: string,
) {
  try {
    await db.insert(schema.activityLog).values({
      actorId: actor?.id ?? null,
      actorName: actor ? actor.name || actor.email || `user ${actor.id}` : "system",
      action,
      entity,
      entityId: entityId === null ? null : String(entityId),
      summary,
    });
  } catch (e) {
    console.error("activity log failed", e);
  }
}
