// npm run db:push:remote
//
// Launch day: copies the catalogue and content (products, photos, categories, brands, pages, banners,
// settings) from the LOCAL D1 into the real D1, and creates the production admin.
// It never copies customers, sellers, orders or the activity log, so test data stays local.
// Refuses to run if the real database already has products.
//
// needs: PROD_ADMIN_EMAIL, PROD_ADMIN_PASSWORD (env), and `npm run db:migrate:remote` done first.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const DB = "gnananetra-marketplace";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const win = process.platform === "win32";
const arg = (a) => (win && /[\s*()]/.test(a) ? `"${a}"` : a);
const wrangler = (...args) => execFileSync(npx, ["wrangler", ...args].map(arg), { encoding: "utf8", shell: win, maxBuffer: 64 * 1024 * 1024 });

// parents first, and parent categories before their sub-categories (D1 checks foreign keys per chunk)
const ORDER = ["brands", "categories", "products", "product_images", "product_categories", "banners", "pages", "settings"];

function pick(sql) {
  const byTable = new Map();
  for (const line of sql.split("\n")) {
    const m = line.match(/^INSERT INTO "([a-z_0-9]+)"/);
    if (m && ORDER.includes(m[1])) byTable.set(m[1], [...(byTable.get(m[1]) ?? []), line]);
  }
  const cats = (byTable.get("categories") ?? []).map((line) => {
    const [, id, parent] = line.match(/VALUES\((\d+),(NULL|\d+),/) ?? [];
    if (!id) throw new Error("could not read a categories row");
    return { line, id, parent: parent === "NULL" ? null : parent };
  });
  const placed = new Set();
  const sorted = [];
  while (sorted.length < cats.length) {
    const ready = cats.filter((c) => !placed.has(c.id) && (!c.parent || placed.has(c.parent)));
    if (!ready.length) throw new Error("categories have a parent loop");
    for (const c of ready) {
      placed.add(c.id);
      sorted.push(c.line);
    }
  }
  byTable.set("categories", sorted);
  return ORDER.flatMap((t) => byTable.get(t) ?? []);
}

const email = process.env.PROD_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.PROD_ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Set PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD (12+ characters).");
  process.exit(1);
}

const count = JSON.parse(wrangler("d1", "execute", DB, "--remote", "--json", "--command", "select count(*) as n from products"));
const n = count?.[0]?.results?.[0]?.n ?? 0;
if (n > 0) {
  console.error(`The real database already has ${n} products. Nothing copied.`);
  process.exit(1);
}

const { hashPassword } = await import("../lib/password.ts");
const hash = await hashPassword(password);
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const file = "tmp/d1-data.sql";
fs.mkdirSync("tmp", { recursive: true });
try {
  wrangler("d1", "export", DB, "--local", "--no-schema", "--output", file);
  const rows = pick(fs.readFileSync(file, "utf8"));
  rows.push(`INSERT INTO "users" ("email","name","role","password_hash","source") VALUES (${q(email)},'Store admin','admin',${q(hash)},'admin');`);
  fs.writeFileSync(file, rows.join("\n") + "\n");
  console.log(wrangler("d1", "execute", DB, "--remote", "--yes", "--file", file));
  console.log(`copied ${rows.length} rows and created admin ${email}`);
} finally {
  fs.rmSync(file, { force: true });
}
