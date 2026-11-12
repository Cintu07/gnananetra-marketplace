import { asc, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettingsFresh } from "@/lib/settings";
import { razorpayLive } from "@/lib/razorpay";
import { storageMode } from "@/lib/storage";
import SettingsView from "@/components/admin/views/settings-view";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin({ owner: true });
  const settings = await getSettingsFresh();
  const categories = await db.select({ slug: s.categories.slug, name: s.categories.name }).from(s.categories).where(isNull(s.categories.parentId)).orderBy(asc(s.categories.sort));
  return (
    <SettingsView
      settings={settings}
      categories={categories}
      integrations={{
        razorpay: razorpayLive(),
        webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
        email: Boolean(process.env.RESEND_API_KEY),
        images: storageMode() === "r2",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "not set",
      }}
    />
  );
}
