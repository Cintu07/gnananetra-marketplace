// npm run smoke   (after `npm run db` and `npm run import`, with `npm run dev -- --port 3002` running; LOCAL only)
//
// Plays every role against the running marketplace over plain HTTP (no browser), using only data it
// creates itself (nothing has to be seeded) and removing all of it afterwards:
//  1. visitors, public pages, the seller area needs a login
//  2. three businesses apply; bad forms are refused
//  3. their first products stay hidden until the team approves them
//  4. the admin approves two (one gets its own commission) and leaves one waiting
//  5. one shopper buys from two stores in a single order; commission is frozen, stock drops
//  6. each seller sees only their own lines and ships them; the order moves once all have; then delivered
//  7. an order mixing a seller's item with the marketplace's own is finished by the team; the lines follow
//  8. a cancelled order returns its stock and never counts as earnings
//  9. earnings and payouts add up to the paisa
// 10. sellers cannot touch each other's things; suspending a seller hides and blocks their products
import { SignJWT } from "jose";
import { testPool } from "./local-d1";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3002";
const SECRET = process.env.AUTH_SECRET ?? "";
if (SECRET.length < 32) throw new Error("AUTH_SECRET is not set (see .env.local)");
const pool = testPool();
const STAMP = Date.now();
const MAIL = (who: string) => `smoke-${who}-${STAMP}@example.com`;
let failures = 0;
const ok = (cond: unknown, label: string, extra = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${!cond && extra ? `\n         ${extra}` : ""}`);
  if (!cond) failures += 1;
};
const section = (t: string) => console.log(`\n${t}`);

type Res = { status: number; text: string; location: string | null; cookie: string };
async function http(path: string, init: RequestInit & { cookie?: string } = {}): Promise<Res> {
  const { cookie, ...rest } = init;
  const res = await fetch(BASE + path, { redirect: "manual", ...rest, headers: { ...(cookie ? { cookie } : {}), ...(rest.headers ?? {}) } });
  const jar = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  return { status: res.status, text: await res.text(), location: res.headers.get("location"), cookie: jar };
}
const get = (path: string, cookie?: string) => http(path, { cookie });

async function session(id: number, role: string, name: string, email: string) {
  const token = await new SignJWT({ role, name, email }).setProtectedHeader({ alg: "HS256" }).setSubject(String(id)).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
  return `gn_session=${token}`;
}

/** Submit a server-action <form> exactly as a browser without JavaScript would: its hidden fields plus yours. */
async function submitForm(page: string, hasField: string, fields: Record<string, string>, cookie?: string) {
  const html = (await get(page, cookie)).text;
  const form = [...html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]).find((f) => f.includes(`name="${hasField}"`));
  if (!form) throw new Error(`no form with a "${hasField}" field on ${page}`);
  const body = new FormData();
  for (const m of form.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g)) body.append(m[1], (m[2] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return http(page, { method: "POST", body, cookie });
}

// Server actions called from client code: find the action's id in the page's scripts (every bundle carries
// a note {"<id>":{"name":"<action>"}}), then call it the way the browser does.
const ids = new Map<string, string>();
async function actionId(page: string, name: string, cookie?: string) {
  const key = `${page}:${name}`;
  if (ids.has(key)) return ids.get(key)!;
  const html = (await get(page, cookie)).text;
  for (const src of [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js[^"]*)"/g)].map((m) => m[1])) {
    const js = (await (await fetch(BASE + src)).text()).replace(/\\"/g, '"');
    const m =
      js.match(new RegExp(`"([0-9a-f]{40,})":\\{"name":"${name}"`)) ?? // dev bundles: a note per action
      js.match(new RegExp(`createServerReference\\)\\("([0-9a-f]{40,})",[^)]*?"${name}"\\)`)); // production bundles
    if (m) return ids.set(key, m[1]).get(key)!;
  }
  throw new Error(`could not find server action ${name} on ${page}`);
}
type Act = { ok: boolean; error?: string; data?: unknown; message?: string };
async function callAction(page: string, name: string, args: unknown[], cookie?: string): Promise<Act> {
  const id = await actionId(page, name, cookie);
  const res = await fetch(BASE + page, { method: "POST", headers: { "next-action": id, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(args) });
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("1:{")); // dev adds a debug line (1:D...) before the result
  if (!line) throw new Error(`unexpected answer from ${name}: ${text.slice(0, 200)}`);
  return JSON.parse(line.slice(2)) as Act;
}

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows as T[];
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await q<T>(sql, params))[0];
const num = (v: unknown) => Number(v ?? 0);
const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const orderStatus = async (id: number) => (await one<{ status: string }>("select status from orders where id = ?", [id])).status;

let house: { id: number; stock_qty: number | null; total_sales: number } | null = null;
await pool.query("delete from rate_limits"); // a clean slate for the per-connection limits

try {
  // ---------------------------------------------------------------- 1. visitors
  section("visitors");
  house = (await one<{ id: number; slug: string; stock_qty: number | null; total_sales: number }>("select id, slug, stock_qty, total_sales from products where seller_id is null and status = 'published' and stock_status = 'in_stock' order by id limit 1"))!;
  const houseSlug = (await one<{ slug: string }>("select slug from products where id = ?", [house.id])).slug;
  for (const p of ["/", "/shop", "/sell", "/sell/apply", "/login", "/cart"]) ok((await get(p)).status === 200, `${p} loads`);
  const pdp = await get(`/product/${houseSlug}`);
  ok(pdp.status === 200 && /Sold by/.test(pdp.text) && /Gnananetra/.test(pdp.text), "the marketplace's own product says it is sold by Gnananetra");
  const anon = await get("/seller");
  ok(anon.status === 307 && /login/.test(anon.location ?? ""), "the Seller Centre needs a login");
  ok((await get("/admin/sellers")).status === 307, "the admin sellers page needs a login");
  ok((await get("/store/not-a-store")).status === 404, "an unknown store is a real 404");

  // ---------------------------------------------------------------- 2. three businesses apply
  section("three businesses apply");
  const form = (who: string, over: Record<string, string> = {}) => ({ name: `Smoke ${who}`, email: MAIL(who), phone: "9876543210", password: "longenough1", storeName: `Smoke Store ${who} ${STAMP}`, city: "Vijayawada", state: "Andhra Pradesh", pickupAddress: "1 Test Street, Vijayawada, 520010", gstin: "", about: "Smoke test store", agree: "on", ...over });
  const refused = [
    ["a bad mobile number", { phone: "12345" }],
    ["a bad GSTIN", { gstin: "NOTAGSTIN" }],
    ["a short password", { password: "short" }],
    ["no agreement to the terms", { agree: "" }],
  ] as const;
  for (const [what, over] of refused) {
    const r = await submitForm("/sell/apply", "storeName", form("bad", over));
    ok(r.status === 200 && !r.location, `${what} is refused`);
  }
  ok(num((await one("select count(*) as n from users where email = ?", [MAIL("bad")])).n) === 0, "and nothing was saved for those");
  const cookies: Record<string, string> = {};
  for (const who of ["A", "B", "C"]) {
    const r = await submitForm("/sell/apply", "storeName", form(who));
    cookies[who] = r.cookie;
    ok(r.status === 303 && /\/seller/.test(r.location ?? "") && /gn_session/.test(r.cookie), `seller ${who} applies and is signed in to the Seller Centre`, `${r.status} ${r.location}`);
  }
  const rows = await q<{ id: number; uid: number; email: string; status: string; role: string }>("select s.id, u.id as uid, u.email, s.status, u.role from sellers s join users u on u.id = s.user_id where u.email like ? order by s.id", [`smoke-_-${STAMP}@example.com`]);
  const S = Object.fromEntries(rows.map((r) => [r.email.split("-")[1].toUpperCase(), r])) as Record<string, (typeof rows)[number]>;
  ok(rows.length === 3 && rows.every((r) => r.status === "pending" && r.role === "seller"), "all three are sellers waiting for approval");
  ok((await submitForm("/sell/apply", "storeName", form("A"))).status === 200, "the same email cannot apply twice");
  const home = await get("/seller", cookies.A);
  ok(home.status === 200 && /being reviewed/.test(home.text), "the Seller Centre says the application is being reviewed");
  for (const p of ["/seller/products", "/seller/products/new", "/seller/orders", "/seller/earnings", "/seller/store"]) ok((await get(p, cookies.A)).status === 200, `${p} loads`);
  const cust = await one<{ id: number }>("insert into users (email, name, role, source) values (?, 'Smoke Customer', 'customer', 'smoke') returning id", [MAIL("cust")]);
  ok((await get("/seller", await session(cust.id, "customer", "Smoke Customer", MAIL("cust")))).status === 307, "a shopper cannot open the Seller Centre");
  const store = await submitForm("/seller/store", "storeName", { storeName: `Smoke Store A ${STAMP}`, tagline: "Genuine parts", about: "About A", phone: "9876543210", city: "Guntur", state: "Andhra Pradesh", gstin: "", pickupAddress: "2 Test Street, Guntur 522001" }, cookies.A);
  ok(store.status === 200 && num((await one("select count(*) as n from sellers where id = ? and city = 'Guntur' and tagline = 'Genuine parts'", [S.A.id])).n) === 1, "a seller can edit their store details");

  // ---------------------------------------------------------------- 3. first products stay hidden
  section("first products, hidden until approved");
  const cat = (await one<{ id: number }>("select id from categories where parent_id is null order by id limit 1"))!;
  const img = (await one<{ url: string }>("select url from product_images limit 1"))!;
  const product = (name: string, over: Record<string, unknown> = {}) => ({ name, categoryId: cat.id, price: 249900, mrp: 299900, stockQty: 5, sku: null, gstRate: 18, hsn: null, warranty: null, highlights: ["First", "Second"], description: "A test product.\n\nSecond paragraph.", images: [{ url: img.url, width: 800, height: 800 }], status: "published", ...over });
  const made: Record<string, { id: number; slug: string }> = {};
  for (const who of ["A", "B", "C"]) {
    const r = await callAction("/seller/products/new", "saveSellerProduct", [product(`Smoke Widget ${who} ${STAMP}`, who === "B" ? { price: 99900, mrp: null } : {})], cookies[who]);
    ok(r.ok, `seller ${who} can add a product`, JSON.stringify(r));
    made[who] = (await one<{ id: number; slug: string }>("select id, slug from products where name = ?", [`Smoke Widget ${who} ${STAMP}`]))!;
  }
  ok((await one<{ seller_id: number }>("select seller_id from products where id = ?", [made.A.id]))!.seller_id === S.A.id, "a product belongs to the seller who added it");
  ok((await callAction("/seller/products/new", "saveSellerProduct", [product("x")], cookies.A)).ok === false, "a one letter name is refused");
  ok((await callAction("/seller/products/new", "saveSellerProduct", [product("Smoke no photo", { images: [] })], cookies.A)).ok === false, "publishing without a photo is refused");
  ok((await callAction("/seller/products/new", "saveSellerProduct", [product("Smoke bad price", { price: 0 })], cookies.A)).ok === false, "a zero price is refused");
  ok((await callAction("/seller/products/new", "saveSellerProduct", [product("Smoke bad gst", { gstRate: 7 })], cookies.A)).ok === false, "an invalid GST rate is refused");
  ok((await callAction("/seller/products/new", "saveSellerProduct", [product("Smoke mrp", { mrp: 100 })], cookies.A)).ok === false, "an MRP below the price is refused");
  ok((await get(`/product/${made.A.slug}`)).status === 404, "the shop does not show an unapproved seller's product");
  const quote0 = await http("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ productId: made.A.id, qty: 1 }] }) });
  ok(/No longer available/.test(quote0.text), "and it cannot be bought either");

  // ---------------------------------------------------------------- 4. the admin decides
  section("the admin decides");
  const admin = (await one<{ id: number; name: string; email: string }>("select id, name, email from users where role = 'admin' limit 1"))!;
  const adminCookie = await session(admin.id, "admin", admin.name, admin.email);
  ok((await get("/admin/sellers", adminCookie)).status === 200, "the admin sees the Sellers page");
  ok(num(JSON.parse((await get("/api/admin/counts", adminCookie)).text).data?.sellers_pending) === 3, "the sidebar counts the three waiting");
  ok((await callAction("/admin/sellers", "setSellerStatus", [S.C.id, "rejected", ""], adminCookie)).ok === false, "rejecting needs a reason");
  ok((await callAction("/admin/sellers", "setSellerStatus", [S.A.id, "approved"], adminCookie)).ok, "seller A is approved");
  ok((await callAction("/admin/sellers", "setSellerStatus", [S.B.id, "approved"], adminCookie)).ok, "seller B is approved");
  ok((await callAction("/admin/sellers", "setSellerCommission", [S.B.id, 8], adminCookie)).ok, "seller B gets their own 8% commission");
  const live = await get(`/product/${made.A.slug}`);
  ok(live.status === 200 && /Sold by/.test(live.text) && /Smoke Store A/.test(live.text), "an approved seller's product is on sale, naming their store");
  ok((await get(`/store/smoke-store-a-${STAMP}`)).status === 200, "their store page is public");
  ok(/Smoke Widget A/.test((await get("/shop?q=Smoke+Widget")).text), "and the product appears in shop search");
  ok((await get(`/store/smoke-store-c-${STAMP}`)).status === 404 && (await get(`/product/${made.C.slug}`)).status === 404, "seller C, still waiting, stays hidden");
  const adminProducts = await get("/admin/products", adminCookie);
  ok(adminProducts.status === 200, "the admin product list loads with the Seller column");

  // ---------------------------------------------------------------- 5. one shopper, two stores, one order
  section("a shopper buys from two stores");
  const shipTo = { name: "Smoke Shopper", line1: "5 Test Road", city: "Vijayawada", state: "Andhra Pradesh", pincode: "520010" };
  const place = (n: number, items: { productId: number; qty: number }[], mail = MAIL("shopper")) =>
    http("/api/checkout", { method: "POST", headers: { "content-type": "application/json", origin: BASE, "cf-connecting-ip": `10.7.${STAMP % 250}.${n}` }, body: JSON.stringify({ items, name: "Smoke Shopper", email: mail, phone: "9812345670", shipping: shipTo, paymentMethod: "cod" }) });
  const c1 = await place(1, [{ productId: made.A.id, qty: 2 }, { productId: made.B.id, qty: 1 }]);
  const placed = JSON.parse(c1.text);
  ok(c1.status === 200 && placed.number, "the order is placed (cash on delivery)", c1.text.slice(0, 200));
  const order = (await one<{ id: number; number: string }>("select id, number from orders where number = ?", [placed.number]))!;
  const items = await q<{ seller_id: number; commission_pct: number; line_total: number; product_id: number }>("select seller_id, commission_pct, line_total, product_id from order_items where order_id = ?", [order.id]);
  ok(items.length === 2 && items.every((i) => i.seller_id), "every line remembers which seller sold it");
  ok(items.find((i) => i.product_id === made.A.id)?.commission_pct === 10, "seller A's line froze the default 10% commission");
  ok(items.find((i) => i.product_id === made.B.id)?.commission_pct === 8, "seller B's line froze their own 8%");
  ok(num((await one("select stock_qty from products where id = ?", [made.A.id]))!.stock_qty) === 3 && num((await one("select stock_qty from products where id = ?", [made.B.id]))!.stock_qty) === 4, "stock dropped in both sellers' products");

  // ---------------------------------------------------------------- 6. fulfilment
  section("each seller ships their own part");
  const mineA = await get("/seller/orders", cookies.A);
  const mineB = await get("/seller/orders", cookies.B);
  ok(mineA.text.includes(order.number) && /Smoke Widget A/.test(mineA.text) && !/Smoke Widget B/.test(mineA.text), "seller A sees the order with only their own item");
  ok(mineB.text.includes(order.number) && /Smoke Widget B/.test(mineB.text) && !/Smoke Widget A/.test(mineB.text), "seller B sees the same order with only theirs");
  ok(/520010/.test(mineA.text), "a seller sees where to ship the order");
  ok(/error=/.test((await submitForm("/seller/orders", "tracking", { orderId: String(order.id), carrier: "Delhivery", tracking: "" }, cookies.A)).location ?? ""), "shipping needs a tracking number");
  ok((await submitForm("/seller/orders", "tracking", { orderId: String(order.id + 9999), carrier: "DTDC", tracking: "XX1" }, cookies.A)).location === "/seller/orders", "a seller cannot ship an order that is not theirs");
  await submitForm("/seller/orders", "tracking", { orderId: String(order.id), carrier: "Delhivery", tracking: `SMK${STAMP}` }, cookies.A);
  const st = await q<{ fulfilment: string; seller_id: number }>("select fulfilment, seller_id from order_items where order_id = ?", [order.id]);
  ok(st.find((i) => i.seller_id === S.A.id)?.fulfilment === "shipped" && st.find((i) => i.seller_id === S.B.id)?.fulfilment === "pending", "only seller A's line is marked shipped");
  ok((await orderStatus(order.id)) === "processing", "the order waits for seller B");
  await submitForm("/seller/orders", "tracking", { orderId: String(order.id), carrier: "DTDC", tracking: `OTH${STAMP}` }, cookies.B);
  ok((await orderStatus(order.id)) === "shipped", "once both shipped, the whole order is shipped");
  ok(num((await one("select count(*) as n from order_events where order_id = ? and message like '%shipped%'", [order.id]))!.n) >= 2, "the customer's timeline records each shipment");
  await submitForm("/seller/orders?view=shipped", "orderId", { orderId: String(order.id) }, cookies.A);
  ok((await orderStatus(order.id)) === "shipped", "one delivery alone does not complete the order");
  await submitForm("/seller/orders?view=shipped", "orderId", { orderId: String(order.id) }, cookies.B);
  const done = (await one<{ status: string; payment_status: string }>("select status, payment_status from orders where id = ?", [order.id]))!;
  ok(done.status === "delivered" && done.payment_status === "paid", "when both delivered, the order is delivered and the cash is recorded as collected");

  // ---------------------------------------------------------------- 7. mixed with the marketplace's own item
  section("an order mixing a seller's item with Gnananetra's own");
  const c2 = await place(2, [{ productId: made.B.id, qty: 1 }, { productId: house.id, qty: 1 }]);
  const order2 = (await one<{ id: number }>("select id from orders where number = ?", [JSON.parse(c2.text).number]))!;
  ok(c2.status === 200 && order2, "the mixed order is placed", c2.text.slice(0, 160));
  const lines2 = await q<{ seller_id: number | null; commission_pct: number }>("select seller_id, commission_pct from order_items where order_id = ?", [order2.id]);
  ok(lines2.some((l) => l.seller_id === null && l.commission_pct === 0), "Gnananetra's own line carries no seller and no commission");
  await submitForm("/seller/orders", "tracking", { orderId: String(order2.id), carrier: "DTDC", tracking: `MIX${STAMP}` }, cookies.B);
  ok((await orderStatus(order2.id)) === "processing", "after the seller ships, the order waits for Gnananetra's own item");
  ok((await callAction(`/admin/orders/${order.id}`, "updateOrderStatus", [order2.id, "shipped", { trackingCarrier: "India Post", trackingNumber: `HSE${STAMP}` }], adminCookie)).ok, "the team ships the rest");
  ok((await orderStatus(order2.id)) === "shipped" && (await q<{ fulfilment: string }>("select fulfilment from order_items where order_id = ?", [order2.id])).every((l) => l.fulfilment === "shipped"), "every line follows the order to shipped");
  ok((await callAction(`/admin/orders/${order.id}`, "updateOrderStatus", [order2.id, "delivered", {}], adminCookie)).ok, "the team marks it delivered");
  ok((await q<{ fulfilment: string }>("select fulfilment from order_items where order_id = ?", [order2.id])).every((l) => l.fulfilment === "delivered"), "and every line follows it to delivered");
  const adminOrder = await get(`/admin/orders/${order2.id}`, adminCookie);
  ok(adminOrder.status === 200 && /Sold by Smoke Store B/.test(adminOrder.text) && /Sold by Gnananetra/.test(adminOrder.text) && /8% commission/.test(adminOrder.text), "the admin sees who sold each line and the commission");

  // ---------------------------------------------------------------- 8. a cancelled order
  section("a cancelled order");
  const stockA0 = num((await one("select stock_qty from products where id = ?", [made.A.id]))!.stock_qty);
  const c3 = await place(3, [{ productId: made.A.id, qty: 1 }]);
  const order3 = (await one<{ id: number }>("select id from orders where number = ?", [JSON.parse(c3.text).number]))!;
  ok(num((await one("select stock_qty from products where id = ?", [made.A.id]))!.stock_qty) === stockA0 - 1, "the unit was taken");
  ok((await callAction(`/admin/orders/${order.id}`, "updateOrderStatus", [order3.id, "cancelled", { notify: false }], adminCookie)).ok, "the team cancels the order");
  ok(num((await one("select stock_qty from products where id = ?", [made.A.id]))!.stock_qty) === stockA0, "the unit goes back on seller A's shelf");
  ok((await one<{ fulfilment: string }>("select fulfilment from order_items where order_id = ?", [order3.id]))!.fulfilment === "cancelled", "the seller's line is cancelled with it");
  ok(!(await get("/seller/orders?view=to-ship", cookies.A)).text.includes(JSON.parse(c3.text).number), "it no longer shows as something to ship");

  // ---------------------------------------------------------------- 9. the money
  section("earnings and payouts");
  const lineA = items.find((i) => i.product_id === made.A.id)!;
  const expectedNet = lineA.line_total - Math.round((lineA.line_total * 10) / 100);
  const earn = await get("/seller/earnings", cookies.A);
  ok(earn.status === 200 && earn.text.includes(money(expectedNet)), `seller A's Earnings show ${money(expectedNet)} payable (sold ${money(lineA.line_total)} less 10%; the cancelled order is not counted)`);
  const lineB = (await q<{ line_total: number; commission_pct: number }>("select line_total, commission_pct from order_items where seller_id = ? and fulfilment = 'delivered'", [S.B.id]));
  const expectedB = lineB.reduce((n, l) => n + l.line_total - Math.round((l.line_total * l.commission_pct) / 100), 0);
  ok((await get("/seller/earnings", cookies.B)).text.includes(money(expectedB)), `seller B's Earnings show ${money(expectedB)} from two delivered orders at 8%`);
  ok((await callAction("/admin/sellers", "recordPayout", [S.A.id, expectedNet / 100 + 1, "UTR1", ""], adminCookie)).ok === false, "a payout bigger than the balance is refused");
  const half = Math.floor(expectedNet / 200);
  ok((await callAction("/admin/sellers", "recordPayout", [S.A.id, half, `UTR${STAMP}`, "smoke"], adminCookie)).ok, "the admin records a payout");
  const afterPay = await get("/seller/earnings", cookies.A);
  ok(afterPay.text.includes(money(expectedNet - half * 100)) && afterPay.text.includes(`UTR${STAMP}`), `the balance drops to ${money(expectedNet - half * 100)} and the payout shows with its bank reference`);
  ok((await callAction("/admin/sellers", "setSellerCommission", [S.A.id, 60], adminCookie)).ok === false, "commission above 50% is refused");
  ok((await callAction("/admin/sellers", "setSellerCommission", [S.A.id, 12], adminCookie)).ok, "the admin can set seller A's own rate");
  ok(num((await one("select commission_pct from order_items where order_id = ? and seller_id = ?", [order.id, S.A.id]))!.commission_pct) === 10, "a new rate never rewrites a past sale");

  // ---------------------------------------------------------------- 10. boundaries
  section("boundaries");
  const hijack = await callAction("/seller/products/new", "saveSellerProduct", [product("Smoke Hijacked", { id: made.B.id })], cookies.A);
  ok(hijack.ok === false && /not yours/.test(String(hijack.error)), "a seller cannot edit another seller's product");
  ok((await one<{ name: string }>("select name from products where id = ?", [made.B.id]))!.name !== "Smoke Hijacked", "and nothing changed");
  ok((await callAction("/seller/products", "quickProduct", [made.B.id, { stockQty: 0 }], cookies.A)).ok === false, "or zero their stock");
  ok((await callAction("/seller/products", "deleteSellerProduct", [made.B.id], cookies.A)).ok === false, "or delete it");
  ok((await callAction("/seller/products", "quickProduct", [made.A.id, { stockQty: 9 }], cookies.A)).ok && num((await one("select stock_qty from products where id = ?", [made.A.id]))!.stock_qty) === 9, "but they can change their own stock");
  ok((await callAction("/seller/products", "deleteSellerProduct", [made.A.id], cookies.A)).message?.includes("Archived") === true, "deleting a product that was ordered archives it instead, so order history stays whole");
  ok((await get("/admin/sellers", cookies.A)).status === 307, "a seller cannot open the admin");
  // a seller calling an admin action is turned away (redirected), and nothing changes
  const turnedAway = await callAction("/admin/sellers", "setSellerStatus", [S.B.id, "suspended", "x"], cookies.A).then((r) => r.ok === false, () => true);
  ok(turnedAway && (await one<{ status: string }>("select status from sellers where id = ?", [S.B.id]))!.status === "approved", "or use the admin's actions: they are turned away and nothing changes");
  const suspend = await callAction("/admin/sellers", "setSellerStatus", [S.B.id, "suspended", "smoke test"], adminCookie);
  ok(suspend.ok && (await get(`/product/${made.B.slug}`)).status === 404 && (await get(`/store/smoke-store-b-${STAMP}`)).status === 404, "suspending a seller hides their products and their store at once");
  ok(/No longer available/.test((await http("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ productId: made.B.id, qty: 1 }] }) })).text), "and stops them being bought");
  ok((await callAction("/admin/sellers", "setSellerStatus", [S.B.id, "approved"], adminCookie)).ok && (await get(`/product/${made.B.slug}`)).status === 200, "approving again brings the shelf back");
} catch (e) {
  failures += 1;
  console.log(`  FAIL the test itself stopped: ${e instanceof Error ? (e.stack ?? e.message) : e}`);
} finally {
  section("cleanup");
  const mails = ["shopper", "cust", "A", "B", "C", "bad"].map(MAIL);
  const orders = await q<{ id: number }>(`select id from orders where email = ?`, [MAIL("shopper")]);
  for (const o of orders) {
    await pool.query("delete from order_events where order_id = ?", [o.id]);
    await pool.query("delete from order_items where order_id = ?", [o.id]);
    await pool.query("delete from orders where id = ?", [o.id]);
  }
  await pool.query("delete from product_images where product_id in (select id from products where name like 'Smoke %')");
  await pool.query("delete from product_categories where product_id in (select id from products where name like 'Smoke %')");
  await pool.query("delete from products where name like 'Smoke %'");
  await pool.query("delete from payouts where seller_id in (select s.id from sellers s join users u on u.id = s.user_id where u.email like ?)", [`smoke-_-${STAMP}@example.com`]);
  await pool.query("delete from sellers where user_id in (select id from users where email like ?)", [`smoke-_-${STAMP}@example.com`]);
  for (const m of mails) await pool.query("delete from users where email = ?", [m]);
  await pool.query("delete from activity_log where summary like '%Smoke Store%'");
  await pool.query("delete from rate_limits");
  // the house product's counters go back to what they were before the test order
  if (house) await pool.query("update products set stock_qty = ?, total_sales = ? where id = ?", [house.stock_qty, house.total_sales, house.id]);
  await pool.end();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}
