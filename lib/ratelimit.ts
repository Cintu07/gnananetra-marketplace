import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Fixed-window rate limiting stored in the database (D1), so every server / Cloudflare isolate
// shares the same counters (memory counters reset per isolate and would be useless there).
// If the database is unreachable we fall back to a per-process window rather than failing open.

const memory = new Map<string, { start: number; hits: number }>();

export async function clientIp() {
  const h = await headers();
  return (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function limited(bucket: string, max: number, windowSec: number, extraKey = "") {
  const key = `${bucket}:${await clientIp()}:${extraKey.toLowerCase()}`.slice(0, 300);
  const start = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  try {
    // window_start is stored in milliseconds, like every other time in the database
    const rows = await db.all<{ hits: number }>(sql`
      insert into rate_limits (key, window_start, hits) values (${key}, ${start * 1000}, 1)
      on conflict (key) do update set
        hits = case when rate_limits.window_start = excluded.window_start then rate_limits.hits + 1 else 1 end,
        window_start = excluded.window_start
      returning hits`);
    if (Math.random() < 0.01) await db.run(sql`delete from rate_limits where window_start < ${Date.now() - 86_400_000}`);
    return Number(rows[0]?.hits ?? 0) > max;
  } catch (e) {
    console.error("rate limit store unavailable, using memory", e);
    const m = memory.get(key);
    const entry = m && m.start === start ? { start, hits: m.hits + 1 } : { start, hits: 1 };
    memory.set(key, entry);
    return entry.hits > max;
  }
}

/** Reject cross-site POSTs to JSON / form endpoints (belt and braces on top of SameSite cookies). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / server-to-server (webhooks check signatures)
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
