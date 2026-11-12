// npm run race   (with `npm run db` and the site running; LOCAL database only)
//
// Proves the shop cannot sell more units than it has:
//  1. one unit left, 10 shoppers press "Place order" at the same moment -> exactly 1 order
//  2. two units left, 6 shoppers -> exactly 2 orders, stock ends at 0 and "out of stock"
//  3. an unpaid online order holds the last unit; when it expires the unit is back on sale
// Restores the product and deletes the test orders afterwards.
import { testPool } from "./local-d1";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";
// talks to the LOCAL D1 file only (scripts/local-d1.ts); production is never touched
const pool = testPool();
const TAG = "race-test";
let failures = 0;
const ok = (cond: unknown, label: string) => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}`);
  if (!cond) failures += 1;
};

const { rows: picked } = await pool.query(
  "select id, slug, stock_qty, stock_status, total_sales, deal_sold from products where status = 'published' and stock_status = 'in_stock' order by id limit 1",
);
const product = picked[0];
const original = { qty: product.stock_qty, status: product.stock_status, sales: product.total_sales, dealSold: product.deal_sold };

async function buy(i: number, method: "cod" | "razorpay" = "cod") {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    // a different "IP" per shopper so the per-IP rate limit doesn't get in the way of the test
    headers: { "Content-Type": "application/json", "cf-connecting-ip": `10.9.${Math.floor(i / 250)}.${i % 250}` },
    body: JSON.stringify({
      items: [{ productId: product.id, qty: 1 }],
      name: `Race Shopper ${i}`,
      email: `${TAG}-${i}@example.com`,
      phone: `98765${String(10000 + i).slice(-5)}`,
      shipping: { name: "Race", line1: "1 Test Street", city: "Vijayawada", state: "Andhra Pradesh", pincode: "520012" },
      paymentMethod: method,
    }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function setStock(qty: number) {
  await pool.query("update products set stock_qty = $2, stock_status = 'in_stock' where id = $1", [product.id, qty]);
}
const stockNow = async () => (await pool.query("select stock_qty, stock_status from products where id = $1", [product.id])).rows[0];

try {
  console.log(`product #${product.id} ${product.slug}`);

  console.log("1 unit, 10 shoppers at once");
  await setStock(1);
  const r1 = await Promise.all(Array.from({ length: 10 }, (_, i) => buy(i)));
  const won1 = r1.filter((r) => r.status === 200);
  ok(won1.length === 1, `${won1.length} order went through (expected exactly 1)`);
  ok(r1.filter((r) => r.status === 409).every((r) => /left|out of stock/i.test(r.body.error ?? "")), "everyone else was told it's sold out");
  const s1 = await stockNow();
  ok(s1.stock_qty === 0 && s1.stock_status === "out_of_stock", `stock is now ${s1.stock_qty}, ${s1.stock_status}`);

  console.log("2 units, 6 shoppers at once");
  await setStock(2);
  const r2 = await Promise.all(Array.from({ length: 6 }, (_, i) => buy(100 + i)));
  ok(r2.filter((r) => r.status === 200).length === 2, `${r2.filter((r) => r.status === 200).length} orders went through (expected exactly 2)`);
  const s2 = await stockNow();
  ok(s2.stock_qty === 0 && s2.stock_status === "out_of_stock", `stock is now ${s2.stock_qty}, ${s2.stock_status}`);

  console.log("unpaid online order holds the unit, then expires");
  await setStock(1);
  const held = await buy(200, "razorpay");
  ok(held.status === 200, "online order reserves the last unit");
  const blocked = await buy(201);
  ok(blocked.status === 409, "a second shopper can't take the reserved unit");
  await pool.query("update orders set created_at = $2 where number = $1", [held.body.number, Date.now() - 2 * 3600_000]);
  const freed = await buy(202); // any checkout first expires stale unpaid orders
  ok(freed.status === 200, "after the 45 minute hold expires, the unit can be bought again");
  const { rows: expired } = await pool.query("select status, stock_held from orders where number = $1", [held.body.number]);
  ok(expired[0]?.status === "failed" && !expired[0]?.stock_held, "the expired order released its stock");
} finally {
  await pool.query(`delete from orders where email like '${TAG}-%'`);
  await pool.query(`delete from users where email like '${TAG}-%' and role = 'customer'`);
  await pool.query("delete from rate_limits");
  await pool.query("update products set stock_qty = $2, stock_status = $3, total_sales = $4, deal_sold = $5 where id = $1", [product.id, original.qty, original.status, original.sales, original.dealSold]);
  await pool.end();
}
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall race checks passed");
process.exit(failures ? 1 : 0);
