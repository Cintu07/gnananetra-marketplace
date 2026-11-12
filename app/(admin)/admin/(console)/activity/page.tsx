import { desc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/site";
import PageHeader from "@/components/admin/page-header";
import { PageBody } from "@/components/admin/page-body";
import { Panel } from "@/components/admin/panel";
import Avatar from "@/components/admin/avatar";
import Tag from "@/components/admin/ui/tag";

export const metadata = { title: "Activity log" };

export default async function ActivityPage() {
  await requireAdmin();
  const rows = await db.select().from(s.activityLog).orderBy(desc(s.activityLog.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Activity log" chip={{ label: "last 300 changes", tone: "muted" }} />
      <PageBody className="max-w-[900px]">
        <Panel className="p-0">
          {rows.length === 0 ? (
            <p className="caption-style p-10 text-center text-subtle">Changes made in the admin will be listed here: who changed what, and when.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <Avatar name={r.actorName} className="mt-0.5 size-6 text-[10px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[13.5px]">{r.summary}</p>
                    <p className="caption-style text-subtle">
                      {r.actorName} · {formatDate(r.createdAt, true)}
                    </p>
                  </div>
                  <Tag tone="neutral" size="sm">
                    {r.entity}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </PageBody>
    </>
  );
}
