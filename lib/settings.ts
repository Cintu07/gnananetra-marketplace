import "server-only";
import { unstable_cache } from "next/cache";
import { db, schema } from "@/lib/db";
import { mergeSettings, type Settings } from "@/lib/settings-defaults";

export type { Settings };

export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    const rows = await db.select({ key: schema.settings.key, value: schema.settings.value }).from(schema.settings);
    return mergeSettings(rows);
  },
  ["settings"],
  { tags: ["settings"], revalidate: 3600 },
);

/** Uncached read, for checkout and anything that moves money. */
export async function getSettingsFresh(): Promise<Settings> {
  const rows = await db.select({ key: schema.settings.key, value: schema.settings.value }).from(schema.settings);
  return mergeSettings(rows);
}
