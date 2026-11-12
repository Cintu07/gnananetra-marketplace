CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` integer,
	`actor_name` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`label` text,
	`name` text NOT NULL,
	`phone` text,
	`company` text,
	`gstin` text,
	`line1` text NOT NULL,
	`line2` text,
	`landmark` text,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`pincode` text NOT NULL,
	`country` text DEFAULT 'IN' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `addresses_user_idx` ON `addresses` (`user_id`);--> statement-breakpoint
CREATE TABLE `banners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`placement` text DEFAULT 'hero' NOT NULL,
	`eyebrow` text,
	`title` text NOT NULL,
	`subtitle` text,
	`cta_label` text,
	`cta_href` text,
	`image` text,
	`theme` text DEFAULT 'dark' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`is_visible` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`wp_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_key` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`image` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`wp_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_key` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'percent' NOT NULL,
	`value` integer NOT NULL,
	`min_subtotal` integer DEFAULT 0 NOT NULL,
	`max_discount` integer,
	`starts_at` integer,
	`ends_at` integer,
	`usage_limit` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "coupons_usage_within_limit" CHECK("coupons"."usage_limit" is null or "coupons"."used_count" <= "coupons"."usage_limit")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_key` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'contact' NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`company` text,
	`subject` text,
	`message` text NOT NULL,
	`product_id` integer,
	`quantity` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`admin_note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`actor` text,
	`is_customer_visible` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`name` text NOT NULL,
	`sku` text,
	`image` text,
	`unit_price` integer NOT NULL,
	`qty` integer NOT NULL,
	`line_total` integer NOT NULL,
	`gst_rate` integer DEFAULT 18 NOT NULL,
	`hsn` text,
	`seller_id` integer,
	`commission_pct` integer DEFAULT 0 NOT NULL,
	`fulfilment` text DEFAULT 'pending' NOT NULL,
	`tracking_carrier` text,
	`tracking_number` text,
	`shipped_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_seller_idx` ON `order_items` (`seller_id`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_product_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`user_id` integer,
	`email` text,
	`phone` text,
	`name` text DEFAULT '' NOT NULL,
	`shipping_address` text,
	`billing_address` text,
	`gstin` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`shipping_fee` integer DEFAULT 0 NOT NULL,
	`cod_fee` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`refunded_amount` integer DEFAULT 0 NOT NULL,
	`coupon_code` text,
	`razorpay_order_id` text,
	`razorpay_payment_id` text,
	`tracking_carrier` text,
	`tracking_number` text,
	`tracking_url` text,
	`customer_note` text,
	`admin_note` text,
	`stock_held` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`access_key` text NOT NULL,
	`wp_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`paid_at` integer,
	`shipped_at` integer,
	`delivered_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_key` ON `orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_order_key` ON `orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content_html` text DEFAULT '' NOT NULL,
	`seo_description` text,
	`is_published` integer DEFAULT true NOT NULL,
	`show_in_footer` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_key` ON `pages` (`slug`);--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`reference` text,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payouts_seller_idx` ON `payouts` (`seller_id`);--> statement-breakpoint
CREATE TABLE `product_categories` (
	`product_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`product_id`, `category_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_categories_category_idx` ON `product_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`url` text NOT NULL,
	`alt` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`brand_id` integer,
	`seller_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`price` integer NOT NULL,
	`mrp` integer,
	`cost_price` integer,
	`stock_status` text DEFAULT 'in_stock' NOT NULL,
	`stock_qty` integer,
	`low_stock_at` integer DEFAULT 3 NOT NULL,
	`max_per_order` integer,
	`highlights` text DEFAULT '[]' NOT NULL,
	`specs` text DEFAULT '[]' NOT NULL,
	`description_html` text DEFAULT '' NOT NULL,
	`badge` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_deal` integer DEFAULT false NOT NULL,
	`deal_ends_at` integer,
	`deal_quantity` integer,
	`deal_sold` integer DEFAULT 0 NOT NULL,
	`gst_rate` integer DEFAULT 18 NOT NULL,
	`hsn` text,
	`warranty` text,
	`weight_kg` real,
	`seo_title` text,
	`seo_description` text,
	`total_sales` integer DEFAULT 0 NOT NULL,
	`rating_avg` real DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`wp_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "products_stock_nonneg" CHECK("products"."stock_qty" is null or "products"."stock_qty" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_key` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `products_seller_idx` ON `products` (`seller_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_window_idx` ON `rate_limits` (`window_start`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`email` text,
	`rating` integer NOT NULL,
	`title` text,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`admin_reply` text,
	`wp_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reviews_product_idx` ON `reviews` (`product_id`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`);--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`store_name` text NOT NULL,
	`slug` text NOT NULL,
	`tagline` text,
	`about` text,
	`phone` text,
	`city` text,
	`state` text,
	`gstin` text,
	`pickup_address` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`commission_pct` integer,
	`rejection_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`approved_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sellers_slug_key` ON `sellers` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `sellers_user_key` ON `sellers` (`user_id`);--> statement-breakpoint
CREATE INDEX `sellers_status_idx` ON `sellers` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`notified_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_alerts_product_email_key` ON `stock_alerts` (`product_id`,`email`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'footer' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_key` ON `subscribers` (`email`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text,
	`phone` text,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'customer' NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`notes` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'signup' NOT NULL,
	`marketing_opt_in` integer DEFAULT false NOT NULL,
	`wp_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`last_login_at` integer,
	`password_changed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_key` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_phone_idx` ON `users` (`phone`);