import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { adminOrNull } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

// CSV downloads for Excel / Google Sheets. Money in rupees, dates in IST.
const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const text = v instanceof Date ? v.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : String(v);
  // guard against spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (header: string[], rows: unknown[][]) => "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
const inr = (paise: number | null) => (paise === null ? "" : (paise / 100).toFixed(2));

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await adminOrNull();
  if (!admin) return new Response("unauthorised", { status: 401 });
  const { kind } = await params;
  let body = "";

  if (kind === "orders") {
    const rows = await db
      .select({
        o: s.orders,
        items: sql<string>`(select group_concat(name || ' x' || qty, '; ') from order_items where order_id = "orders"."id")`,
      })
      .from(s.orders)
      .orderBy(desc(s.orders.createdAt));
    body = csv(
      ["Order", "Date", "Status", "Payment", "Payment status", "Customer", "Email", "Phone", "City", "State", "Pincode", "GSTIN", "Items", "Subtotal", "Discount", "Delivery", "COD fee", "Total", "Refunded", "Coupon", "Courier", "Tracking"],
      rows.map(({ o, items }) => [
        o.number,
        o.createdAt,
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        o.name,
        o.email,
        o.phone,
        o.shippingAddress?.city,
        o.shippingAddress?.state,
        o.shippingAddress?.pincode,
        o.gstin,
        items,
        inr(o.subtotal),
        inr(o.discount),
        inr(o.shippingFee),
        inr(o.codFee),
        inr(o.total),
        inr(o.refundedAmount),
        o.couponCode,
        o.trackingCarrier,
        o.trackingNumber,
      ]),
    );
  } else if (kind === "customers") {
    const rows = await db
      .select({
        u: s.users,
        orders: sql<number>`(select count(*) from orders where user_id = "users"."id")`,
        spent: sql<number>`(select coalesce(sum(total), 0) from orders where user_id = "users"."id" and status not in ('cancelled','failed','pending','refunded'))`,
        city: sql<string | null>`(select city from addresses where user_id = "users"."id" order by is_default desc limit 1)`,
      })
      .from(s.users)
      .where(eq(s.users.role, "customer"))
      .orderBy(desc(s.users.createdAt));
    body = csv(
      ["Name", "Email", "Phone", "City", "Orders", "Spent", "Joined", "Source", "Has account", "Tags", "Notes", "Newsletter"],
      rows.map(({ u, orders, spent, city }) => [u.name, u.email, u.phone, city, orders, inr(spent), u.createdAt, u.source, u.passwordHash ? "yes" : "no", u.tags.join("; "), u.notes, u.marketingOptIn ? "yes" : "no"]),
    );
  } else if (kind === "products") {
    const rows = await db
      .select({ p: s.products, brand: s.brands.name, categories: sql<string>`(select group_concat(c.name, '; ') from product_categories pc join categories c on c.id = pc.category_id where pc.product_id = "products"."id")` })
      .from(s.products)
      .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
      .orderBy(s.products.name);
    body = csv(
      ["ID", "Name", "SKU", "Brand", "Categories", "Status", "Price", "MRP", "Cost", "Stock status", "Units", "GST %", "HSN", "Sold", "URL slug"],
      rows.map(({ p, brand, categories }) => [p.id, p.name, p.sku, brand, categories, p.status, inr(p.price), inr(p.mrp), inr(p.costPrice), p.stockStatus, p.stockQty, p.gstRate, p.hsn, p.totalSales, p.slug]),
    );
  } else if (kind === "subscribers") {
    const rows = await db.select().from(s.subscribers).orderBy(desc(s.subscribers.createdAt));
    body = csv(["Email", "Joined", "Source"], rows.map((r) => [r.email, r.createdAt, r.source]));
  } else {
    return new Response("unknown export", { status: 404 });
  }

  await logActivity(admin, "export", kind, null, `Downloaded ${kind} CSV`);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gnananetra-${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
