// npm run audit:mobile [-- 360 390]   (with the site running; SMOKE_URL picks the address)
//
// Opens every important page and state at phone, tablet and desktop widths (320, 360, 390, 768, 1280 px by
// default) in a hidden browser and reports sideways scrolling, tap targets under 40 px, text under 12 px
// and script errors. Screenshots go to tmp/mobile-audit/<width>/. Exit code 1 if anything fails.
//
// The audit makes its own seller, product, customer and order (and removes them at the end), so the
// seller screens have something to show without any sample data in the database.
import fs from "node:fs";
import path from "node:path";
import { SignJWT } from "jose";
import { DatabaseSync } from "node:sqlite";
import { runAudit } from "./audit-core.mjs";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3002";
const widths = process.argv.slice(2).map(Number).filter(Boolean);
const WIDTHS = widths.length ? widths : [320, 360, 390, 768, 1280];
const executablePath = [process.env.BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find((p) => fs.existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found. Set BROWSER=/path/to/chrome");

const D1 = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const file = fs.readdirSync(D1).filter((f) => f.endsWith(".sqlite")).map((f) => path.join(D1, f)).find((f) => new DatabaseSync(f, { readOnly: true }).prepare("select 1 from sqlite_master where name = 'sellers'").get());
const db = new DatabaseSync(file);
db.exec("pragma busy_timeout = 5000");
const TAG = `audit-${Date.now()}`;
const now = Date.now();
const admin = db.prepare("select id, name, email from users where role = 'admin' limit 1").get();
const house = db.prepare("select slug from products where status = 'published' and seller_id is null limit 1").get();
const category = db.prepare("select id, slug from categories where parent_id is null limit 1").get();
const image = db.prepare("select url from product_images limit 1").get();

const run = (sql, ...args) => Number(db.prepare(sql).run(...args).lastInsertRowid);
const mkUser = (email, name, role) => run("insert into users (email, name, role, source, created_at) values (?, ?, ?, 'audit', ?)", email, name, role, now);
const sellerUser = mkUser(`${TAG}-seller@example.com`, "Audit Seller", "seller");
const pendingUser = mkUser(`${TAG}-pending@example.com`, "Audit Pending", "seller");
const buyer = mkUser(`${TAG}-buyer@example.com`, "Audit Buyer", "customer");
const mkSeller = (uid, name, slug, status) =>
  run("insert into sellers (user_id, store_name, slug, tagline, about, phone, city, state, pickup_address, status, created_at, approved_at) values (?, ?, ?, 'Genuine stock, same day dispatch', 'A store used by the mobile audit.', '9876543210', 'Vijayawada', 'Andhra Pradesh', '1 Audit Street, Vijayawada', ?, ?, ?)", uid, name, slug, status, now, status === "approved" ? now : null);
const sellerId = mkSeller(sellerUser, `Audit Store ${TAG}`, `audit-store-${TAG}`, "approved");
mkSeller(pendingUser, `Audit Waiting ${TAG}`, `audit-waiting-${TAG}`, "pending");

const productName = `Audit Product ${TAG} with a rather long name to test wrapping on small phones`;
const productId = run(
  "insert into products (slug, name, seller_id, status, price, mrp, stock_status, stock_qty, highlights, specs, description_html, gst_rate, created_at, updated_at) values (?, ?, ?, 'published', 249900, 299900, 'in_stock', 5, ?, '[]', '<p>A product used by the mobile audit.</p>', 18, ?, ?)",
  `audit-product-${TAG}`, productName, sellerId, JSON.stringify(["Genuine product", "One year warranty"]), now, now,
);
db.prepare("insert into product_images (product_id, url, sort) values (?, ?, 0)").run(productId, image.url);
db.prepare("insert into product_categories (product_id, category_id) values (?, ?)").run(productId, category.id);
const orderId = run(
  "insert into orders (number, user_id, email, phone, name, shipping_address, status, payment_method, payment_status, subtotal, total, access_key, source, created_at, updated_at) values (?, ?, ?, '9812345670', 'Audit Buyer', ?, 'processing', 'cod', 'unpaid', 499800, 499800, 'auditkey', 'audit', ?, ?)",
  `AUD${now}`, buyer, `${TAG}-buyer@example.com`, JSON.stringify({ name: "Audit Buyer", line1: "5 Test Road", city: "Vijayawada", state: "Andhra Pradesh", pincode: "520010" }), now, now,
);
db.prepare("insert into order_items (order_id, product_id, name, unit_price, qty, line_total, gst_rate, seller_id, commission_pct, fulfilment) values (?, ?, ?, 249900, 2, 499800, 18, ?, 10, 'pending')").run(orderId, productId, productName, sellerId);

const cleanup = () => {
  db.prepare("delete from order_items where order_id = ?").run(orderId);
  db.prepare("delete from orders where id = ?").run(orderId);
  db.prepare("delete from product_images where product_id = ?").run(productId);
  db.prepare("delete from product_categories where product_id = ?").run(productId);
  db.prepare("delete from products where id = ?").run(productId);
  db.prepare("delete from sellers where user_id in (?, ?)").run(sellerUser, pendingUser);
  db.prepare("delete from users where id in (?, ?, ?)").run(sellerUser, pendingUser, buyer);
  db.close();
};

const sign = async (id, role, name, email) => `gn_session=${await new SignJWT({ role, name, email }).setProtectedHeader({ alg: "HS256" }).setSubject(String(id)).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET))}`;
const sellerCookie = await sign(sellerUser, "seller", "Audit Seller", `${TAG}-seller@example.com`);
const pendingCookie = await sign(pendingUser, "seller", "Audit Pending", `${TAG}-pending@example.com`);
const adminCookie = await sign(admin.id, "admin", admin.name, admin.email);

// name, path, optional steps run after load (open a menu, ...), optional cookie
const PAGES = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "category", path: `/category/${category.slug}` },
  { name: "product-house", path: `/product/${house.slug}` },
  { name: "product-seller", path: `/product/audit-product-${TAG}` },
  { name: "store", path: `/store/audit-store-${TAG}` },
  { name: "cart", path: "/cart" },
  { name: "login", path: "/login" },
  { name: "sell", path: "/sell" },
  { name: "sell-apply", path: "/sell/apply" },
  { name: "menu-open", path: "/", steps: async (p, w) => { if (w < 1024) await p.click('button[aria-label="Open menu"]'); } },
  { name: "seller-home", path: "/seller", cookie: sellerCookie },
  { name: "seller-pending", path: "/seller", cookie: pendingCookie },
  { name: "seller-products", path: "/seller/products", cookie: sellerCookie },
  { name: "seller-product-new", path: "/seller/products/new", cookie: sellerCookie },
  { name: "seller-product-edit", path: `/seller/products/${productId}`, cookie: sellerCookie },
  { name: "seller-orders", path: "/seller/orders", cookie: sellerCookie },
  { name: "seller-earnings", path: "/seller/earnings", cookie: sellerCookie },
  { name: "seller-store", path: "/seller/store", cookie: sellerCookie },
  { name: "admin-sellers", path: "/admin/sellers", cookie: adminCookie },
  { name: "admin-dashboard", path: "/admin", cookie: adminCookie },
  { name: "admin-order", path: `/admin/orders/${orderId}`, cookie: adminCookie },
];

let failed = 1;
try {
  failed = await runAudit({ BASE, PAGES, WIDTHS, executablePath });
} finally {
  cleanup();
}
process.exit(failed ? 1 : 0);
