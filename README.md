# Gnananetra Marketplace

A multi-seller store in the style of Flipkart or Amazon: businesses apply to sell, the team approves them, they list products and ship orders, shoppers buy from many stores in one checkout, and the marketplace keeps a commission. Built on the Gnananetra shop (same checkout, GST invoice, admin, and oversell-proof stock), with a seller layer added. Not deployed.

Next.js 16, Cloudflare Workers, D1 (SQLite via Drizzle), Tailwind 4. Same colours and logo as the shop.

## Run it

```bash
npm install
npm run db                          # creates the local D1 database (.wrangler/)
npm run import                      # loads the catalogue, policy pages, settings, first admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev -- --port 3002          # http://localhost:3002
npm run smoke                       # 98 end-to-end checks over HTTP (the site must be running)
SMOKE_URL=http://localhost:3002 npm run race   # last-unit race
```

`.env.local` needs `AUTH_SECRET` (32+), `ADMIN_EMAIL`, `ADMIN_PASSWORD`. `npm run check` = typecheck + production build.

There is no sample data. The site starts with the catalogue as the marketplace's own shelf ("Sold by Gnananetra"); sellers appear when real businesses apply at `/sell/apply` and the admin approves them at `/admin/sellers`. `npm run smoke` creates its own sellers, products and orders and deletes them afterwards. It was also run against the production build inside Cloudflare's runtime (workerd): 98 of 98.

## How it works

| Who | Where | What they do |
|---|---|---|
| Shopper | `/`, `/shop`, `/store/<seller>` | Browse, "Sold by" on every product, one cart across stores, COD or online payment |
| Applicant | `/sell`, `/sell/apply` | Applies with store, contact, pickup address, optional GSTIN; signed in and placed in `pending` |
| Seller | `/seller` (Seller Centre) | Overview, products (add, edit, stock, hide), orders (ship with tracking, mark delivered), earnings and payouts, store profile |
| Admin | `/admin/sellers` | Approve, reject (reason), suspend, set a seller's own commission, record payouts |

- **Visibility:** a product is on sale when it is published and (it is the marketplace's own, or its seller is approved). Suspending a seller hides their whole shelf at once; pending sellers can prepare products that stay hidden until approval (`visible` in `lib/catalog.ts`; `priceCart` refuses them too).
- **Orders:** every order line carries its seller and the commission rate frozen at purchase (`lib/orders.ts`), so later rate changes never rewrite past sales. One order can span several sellers. Each seller sees only their own lines and the ship-to address.
- **Fulfilment:** a seller marks their lines shipped (courier and tracking number required). The order becomes shipped when every seller has shipped, delivered when all have delivered (cash on delivery is then recorded as collected). Each step is on the customer's timeline and emailed.
- **Money** (`lib/marketplace.ts`): a seller earns the line total minus commission (default 10%, `DEFAULT_COMMISSION_PCT`). Delivered earnings are payable; sold-but-undelivered is "in progress"; cancelled or refunded orders never count. The admin transfers money outside the site and records it as a payout (never more than the balance); the seller sees it under Earnings.
- **Stock:** unchanged from the shop: `stock_qty - n` in one D1 batch with a CHECK that refuses to go below zero, so two buyers can never get the last unit (proved by `npm run race`).
- **Data model additions:** `sellers`, `payouts`, `products.seller_id`, and on `order_items`: `seller_id`, `commission_pct`, `fulfilment`, tracking.

## Notes on the data

The catalogue (192 products with photos) is the Gnananetra shop's own, shown as the marketplace's house shelf. Only 2 of those products have unit counts; set the rest in Admin > Inventory so the oversell protection covers them (seller products always have a count). No customers or orders are copied from the shop.

## Not built yet (decide with the client)

- Online payment is the shop's Razorpay flow (test mode until keys exist). Paying sellers automatically (Razorpay Route / split settlements) would replace the manual payout record.
- Seller KYC and bank details are not collected (the admin pays against details exchanged offline). Add them before real payouts.
- Product moderation: approved sellers publish instantly; the admin can archive anything.
- Per-seller GST invoices and marketplace tax collection (TCS): today there is one invoice per order, as in the shop. A real multi-seller launch needs each seller's own invoice and the tax rules checked with a CA.
- Orders that mix a seller's items with Gnananetra's own are finished by the team (their items are not seller-shipped); the seller lines then follow the order.
- Returns, disputes, seller ratings, shipping-rate rules per seller, bulk product upload.
- The Cloudflare account is shared with other live apps: keep the Worker name `gnananetra-marketplace`, never deploy unless the client says go.
