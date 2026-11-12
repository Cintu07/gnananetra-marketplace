import "server-only";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

// Cloudflare D1. On Workers the binding comes with each request; under `next dev` the same
// binding is a local D1 (initOpenNextCloudflareForDev in next.config.ts), stored in .wrangler/.

export type DB = DrizzleD1Database<typeof schema>;
type D1 = Parameters<typeof drizzle>[0];

const cache = new WeakMap<object, DB>();

function binding(): D1 {
  const { env } = getCloudflareContext();
  const d1 = (env as unknown as { DB?: D1 }).DB;
  if (!d1) throw new Error("The D1 binding `DB` is missing. Check wrangler.jsonc, then run `npm run db`.");
  return d1;
}

function real(): DB {
  const d1 = binding();
  let d = cache.get(d1);
  if (!d) {
    d = drizzle(d1, { schema });
    cache.set(d1, d);
  }
  return d;
}

// Lazy so that importing this module never needs a database (e.g. during the build).
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const target = real() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
  },
});

type Prepared = { getQuery(): { sql: string; params: unknown[] }; mapResult(result: unknown, isFromBatch?: boolean): unknown };
type D1Client = { prepare(sql: string): { bind(...params: unknown[]): unknown }; batch(stmts: unknown[]): Promise<unknown[]> };

/** Run statements as ONE D1 batch: a single transaction, all or nothing.
 *  (drizzle's own db.batch() crashes on raw `db.run(sql...)` statements that carry
 *  parameters, so each statement is prepared here directly and mapped back by drizzle.) */
export async function runBatch(items: BatchItem<"sqlite">[]): Promise<unknown[]> {
  if (!items.length) return [];
  const client = (real() as unknown as { $client: D1Client }).$client;
  const prepared = items.map((q) => (q as unknown as { _prepare(): Prepared })._prepare());
  const stmts = prepared.map((p) => {
    const { sql, params } = p.getQuery();
    return client.prepare(sql).bind(...params);
  });
  const results = await client.batch(stmts);
  return results.map((r, i) => prepared[i].mapResult(r, true));
}

/** Was this error the database refusing a write because of a named CHECK rule? */
export function brokeRule(e: unknown, rule: string): boolean {
  for (let x: unknown = e, depth = 0; x && depth < 5; x = (x as { cause?: unknown }).cause, depth++) {
    if (String((x as { message?: unknown }).message ?? "").includes(`CHECK constraint failed: ${rule}`)) return true;
  }
  return false;
}

/** D1 allows at most 100 bound values per statement; split long id lists. */
export function chunks<T>(list: T[], size = 90): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export { schema };
