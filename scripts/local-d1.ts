// Scripts (import, smoke, race) reach the LOCAL D1 database directly: it is a plain SQLite
// file that wrangler / `next dev` keep under .wrangler/state. Never used in production.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "../db/schema";

const DIR = path.resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");

/** The local D1 file that holds the shop (the one with a products table). */
export function localD1Path() {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".sqlite")) : [];
  for (const f of files) {
    const probe = new DatabaseSync(path.join(DIR, f), { readOnly: true });
    try {
      const hit = probe.prepare("select 1 from sqlite_master where type = 'table' and name = 'products'").get();
      if (hit) return path.join(DIR, f);
    } finally {
      probe.close();
    }
  }
  throw new Error("No local D1 database found. Run `npm run db` first.");
}

export function openLocal() {
  const sqlite = new DatabaseSync(localD1Path());
  sqlite.exec("pragma busy_timeout = 5000; pragma foreign_keys = on;");
  const run = (query: string, params: unknown[], method: "run" | "all" | "values" | "get") => {
    const stmt = sqlite.prepare(query);
    const args = params as (string | number | null | bigint | Uint8Array)[];
    if (method === "run") {
      stmt.run(...args);
      return { rows: [] as unknown[] };
    }
    stmt.setReturnArrays(true);
    if (method === "get") return { rows: (stmt.get(...args) as unknown[] | undefined) ?? [] };
    return { rows: stmt.all(...args) as unknown[] };
  };
  const db = drizzle(
    async (query, params, method) => run(query, params, method),
    async (queries) => {
      // a batch is all or nothing, like D1
      sqlite.exec("begin");
      try {
        const out = queries.map((q) => run(q.sql, q.params, q.method));
        sqlite.exec("commit");
        return out;
      } catch (e) {
        sqlite.exec("rollback");
        throw e;
      }
    },
    { schema },
  );
  /** plain rows as objects, for quick checks in the test scripts */
  const all = <T = Record<string, unknown>>(query: string, ...params: unknown[]) =>
    sqlite.prepare(query).all(...(params as (string | number | null)[])) as T[];
  const exec = (query: string, ...params: unknown[]) => sqlite.prepare(query).run(...(params as (string | number | null)[]));
  return { db, sqlite, all, exec, close: () => sqlite.close() };
}

/** The `pool.query(text, [params])` shape the test scripts use, with $1 style placeholders. */
export function testPool() {
  const local = openLocal();
  return {
    async query(text: string, params: unknown[] = []) {
      const stmt = local.sqlite.prepare(text.replace(/\$(\d+)/g, "?$1"));
      const args = params as (string | number | null)[];
      const reads = /^\s*(select|with)\b/i.test(text) || /\breturning\b/i.test(text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { rows: (reads ? stmt.all(...args) : (stmt.run(...args), [])) as any[] };
    },
    async end() {
      local.close();
    },
  };
}
