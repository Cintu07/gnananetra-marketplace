import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

// Cloudflare D1 (SQLite). Money is always whole paise (integer). 249900 = Rs 2,499.00.
// Times are stored as milliseconds since 1970 and come back as Date objects.

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const nowMs = sql`(cast(unixepoch('subsec') * 1000 as integer))`;
const created = () => ts("created_at").notNull().default(nowMs);
const updated = () => ts("updated_at").notNull().default(nowMs);
const bool = (name: string) => integer(name, { mode: "boolean" });
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

export type Address = {
  name: string;
  phone?: string | null;
  company?: string | null;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
};

export type SpecGroup = { title: string; rows: [string, string][] };

// ---------------------------------------------------------------- people

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email"),
    phone: text("phone"),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("customer"), // customer | seller | staff | admin
    isBlocked: bool("is_blocked").notNull().default(false),
    notes: text("notes"),
    tags: json<string[]>("tags").notNull().default(sql`'[]'`),
    source: text("source").notNull().default("signup"), // signup | checkout | admin | wordpress-account | wordpress-guest-order
    marketingOptIn: bool("marketing_opt_in").notNull().default(false),
    wpId: integer("wp_id"),
    createdAt: created(),
    lastLoginAt: ts("last_login_at"),
    // sessions issued before this moment are rejected (password change / reset signs out everywhere)
    passwordChangedAt: ts("password_changed_at"),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email), index("users_role_idx").on(t.role), index("users_phone_idx").on(t.phone)],
);

// ---------------------------------------------------------------- marketplace

/** A business that sells through the marketplace. One seller = one login (a users row with role "seller"). */
export const sellers = sqliteTable(
  "sellers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeName: text("store_name").notNull(),
    slug: text("slug").notNull(),
    tagline: text("tagline"),
    about: text("about"),
    phone: text("phone"),
    city: text("city"),
    state: text("state"),
    gstin: text("gstin"),
    pickupAddress: text("pickup_address"),
    // pending (applied, waiting for the team) | approved | rejected | suspended
    status: text("status").notNull().default("pending"),
    commissionPct: integer("commission_pct"), // null = the marketplace default (lib/marketplace.ts)
    rejectionReason: text("rejection_reason"),
    createdAt: created(),
    approvedAt: ts("approved_at"),
  },
  (t) => [uniqueIndex("sellers_slug_key").on(t.slug), uniqueIndex("sellers_user_key").on(t.userId), index("sellers_status_idx").on(t.status)],
);

/** Money the marketplace has paid out to a seller (bank transfer done outside the site, recorded here). */
export const payouts = sqliteTable(
  "payouts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // paise
    reference: text("reference"), // bank transfer reference
    note: text("note"),
    createdAt: created(),
  },
  (t) => [index("payouts_seller_idx").on(t.sellerId)],
);

// Shared rate limiting (works across every Cloudflare isolate, unlike memory).
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    windowStart: ts("window_start").notNull(),
    hits: integer("hits").notNull().default(0),
  },
  (t) => [index("rate_limits_window_idx").on(t.windowStart)],
);

export const addresses = sqliteTable(
  "addresses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    name: text("name").notNull(),
    phone: text("phone"),
    company: text("company"),
    gstin: text("gstin"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    landmark: text("landmark"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    country: text("country").notNull().default("IN"),
    isDefault: bool("is_default").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

export const passwordResets = sqliteTable("password_resets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: created(),
});

// ---------------------------------------------------------------- catalogue

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references((): AnySQLiteColumn => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    image: text("image"),
    sort: integer("sort").notNull().default(0),
    isVisible: bool("is_visible").notNull().default(true),
    wpId: integer("wp_id"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("categories_slug_key").on(t.slug), index("categories_parent_idx").on(t.parentId)],
);

export const brands = sqliteTable(
  "brands",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    isVisible: bool("is_visible").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    wpId: integer("wp_id"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("brands_slug_key").on(t.slug)],
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sku: text("sku"),
    brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
    sellerId: integer("seller_id").references(() => sellers.id, { onDelete: "set null" }), // null = sold by the marketplace itself
    status: text("status").notNull().default("draft"), // published | draft | archived
    price: integer("price").notNull(), // selling price, paise
    mrp: integer("mrp"), // struck-through price, paise
    costPrice: integer("cost_price"), // admin only, for margin
    stockStatus: text("stock_status").notNull().default("in_stock"), // in_stock | out_of_stock | preorder
    stockQty: integer("stock_qty"), // null = not counted, stockStatus alone decides
    lowStockAt: integer("low_stock_at").notNull().default(3),
    maxPerOrder: integer("max_per_order"),
    highlights: json<string[]>("highlights").notNull().default(sql`'[]'`),
    specs: json<SpecGroup[]>("specs").notNull().default(sql`'[]'`),
    descriptionHtml: text("description_html").notNull().default(""),
    badge: text("badge"),
    isFeatured: bool("is_featured").notNull().default(false),
    isDeal: bool("is_deal").notNull().default(false),
    dealEndsAt: ts("deal_ends_at"),
    dealQuantity: integer("deal_quantity"),
    dealSold: integer("deal_sold").notNull().default(0),
    gstRate: integer("gst_rate").notNull().default(18), // percent, prices include gst
    hsn: text("hsn"),
    warranty: text("warranty"),
    weightKg: real("weight_kg"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    totalSales: integer("total_sales").notNull().default(0),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    wpId: integer("wp_id"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_status_idx").on(t.status),
    index("products_brand_idx").on(t.brandId),
    index("products_seller_idx").on(t.sellerId),
    // The overselling guard. A sale that would take a counted product below zero fails this
    // check, and D1 rolls back the whole batch it was in (the entire order). See lib/orders.ts.
    check("products_stock_nonneg", sql`${t.stockQty} is null or ${t.stockQty} >= 0`),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sort: integer("sort").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("product_categories_category_idx").on(t.categoryId)],
);

// ---------------------------------------------------------------- orders

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    phone: text("phone"),
    name: text("name").notNull().default(""),
    shippingAddress: json<Address | null>("shipping_address"),
    billingAddress: json<Address | null>("billing_address"),
    gstin: text("gstin"),
    // pending (awaiting online payment) | processing (to pack) | packed | shipped | delivered
    // | cancelled | refunded | on_hold | failed
    status: text("status").notNull().default("pending"),
    paymentMethod: text("payment_method").notNull(), // razorpay | cod
    paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | paid | refunded | partially_refunded | failed
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    shippingFee: integer("shipping_fee").notNull().default(0),
    codFee: integer("cod_fee").notNull().default(0),
    total: integer("total").notNull(),
    refundedAmount: integer("refunded_amount").notNull().default(0),
    couponCode: text("coupon_code"),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    trackingCarrier: text("tracking_carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    stockHeld: bool("stock_held").notNull().default(false),
    source: text("source").notNull().default("web"), // web | admin | wordpress
    accessKey: text("access_key").notNull(), // lets a guest open their own order page
    wpId: integer("wp_id"),
    createdAt: created(),
    updatedAt: updated(),
    paidAt: ts("paid_at"),
    shippedAt: ts("shipped_at"),
    deliveredAt: ts("delivered_at"),
    cancelledAt: ts("cancelled_at"),
  },
  (t) => [
    uniqueIndex("orders_number_key").on(t.number),
    uniqueIndex("orders_razorpay_order_key").on(t.razorpayOrderId),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    sku: text("sku"),
    image: text("image"),
    unitPrice: integer("unit_price").notNull(),
    qty: integer("qty").notNull(),
    lineTotal: integer("line_total").notNull(),
    gstRate: integer("gst_rate").notNull().default(18),
    hsn: text("hsn"),
    // marketplace: who sold this line, what the marketplace keeps, and where shipping stands
    sellerId: integer("seller_id").references(() => sellers.id, { onDelete: "set null" }),
    commissionPct: integer("commission_pct").notNull().default(0),
    fulfilment: text("fulfilment").notNull().default("pending"), // pending | shipped | delivered | cancelled
    trackingCarrier: text("tracking_carrier"),
    trackingNumber: text("tracking_number"),
    shippedAt: ts("shipped_at"),
  },
  (t) => [index("order_items_seller_idx").on(t.sellerId), index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // created | paid | status | note | refund | payment_failed | email
    message: text("message").notNull(),
    actor: text("actor"),
    isCustomerVisible: bool("is_customer_visible").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const coupons = sqliteTable(
  "coupons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    description: text("description"),
    type: text("type").notNull().default("percent"), // percent | flat
    value: integer("value").notNull(), // percent (1-100) or paise
    minSubtotal: integer("min_subtotal").notNull().default(0),
    maxDiscount: integer("max_discount"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    isActive: bool("is_active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("coupons_code_key").on(t.code),
    // a code with a usage limit can never be used more times than allowed (same trick as stock)
    check("coupons_usage_within_limit", sql`${t.usageLimit} is null or ${t.usedCount} <= ${t.usageLimit}`),
  ],
);

// ---------------------------------------------------------------- engagement

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull().default(""),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    isVerified: bool("is_verified").notNull().default(false),
    adminReply: text("admin_reply"),
    wpId: integer("wp_id"),
    createdAt: created(),
  },
  (t) => [index("reviews_product_idx").on(t.productId), index("reviews_status_idx").on(t.status)],
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull().default("contact"), // contact | bulk_quote | product
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    subject: text("subject"),
    message: text("message").notNull(),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    quantity: integer("quantity"),
    status: text("status").notNull().default("new"), // new | in_progress | resolved | spam
    adminNote: text("admin_note"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("inquiries_status_idx").on(t.status)],
);

export const stockAlerts = sqliteTable(
  "stock_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    phone: text("phone"),
    createdAt: created(),
    notifiedAt: ts("notified_at"),
  },
  (t) => [uniqueIndex("stock_alerts_product_email_key").on(t.productId, t.email)],
);

export const subscribers = sqliteTable(
  "subscribers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    source: text("source").notNull().default("footer"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("subscribers_email_key").on(t.email)],
);

// ---------------------------------------------------------------- content

export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  placement: text("placement").notNull().default("hero"), // hero | promo
  eyebrow: text("eyebrow"),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  image: text("image"),
  theme: text("theme").notNull().default("dark"), // dark | light | brand
  sort: integer("sort").notNull().default(0),
  isActive: bool("is_active").notNull().default(true),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  createdAt: created(),
});

export const pages = sqliteTable(
  "pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    contentHtml: text("content_html").notNull().default(""),
    seoDescription: text("seo_description"),
    isPublished: bool("is_published").notNull().default(true),
    showInFooter: bool("show_in_footer").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("pages_slug_key").on(t.slug)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
  updatedAt: updated(),
});

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorId: integer("actor_id"),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    createdAt: created(),
  },
  (t) => [index("activity_log_created_idx").on(t.createdAt)],
);
