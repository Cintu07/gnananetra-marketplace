<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Gnananetra Marketplace (multi-seller, built on the Gnananetra shop)

> Agent context. Human docs: README.md. Current state: docs/PROGRESS.md. Deploy: docs/DEPLOY-CLOUDFLARE.md.
> Open questions for the client: docs/CLIENT-QUESTIONS.md.

Online store + admin for Gnananetra Industries Pvt Ltd (Vijayawada): printers, computers, UPS, ACs.
Replaces their WordPress/WooCommerce site (data migrated by scripts/wp_*.py). Target host: Cloudflare Workers.

## Run / check

- `npm run db` (creates / migrates the local D1 in .wrangler/), `npm run import:wp` (first time), then `npm run dev`
- before saying anything works: `npm run check` (typecheck + build), `npm run smoke`, `npm run race`, `npm run audit:mobile`
- Cloudflare build only runs on Linux/macOS/WSL: `bash scripts/cloudflare-check.sh`

## Rules

- Money is integer paise everywhere. Prices include GST. Totals only come from `lib/pricing.ts`.
- Data lives in Cloudflare D1 (SQLite), photos in R2. No interactive transactions: anything that must be atomic is ONE `runBatch()` (`lib/db.ts`).
- Stock only changes in `lib/orders.ts` (`stock_qty - n` in a batch; the `products_stock_nonneg` CHECK undoes the whole order if it would go below 0). Never decrement elsewhere.
- D1 takes at most 100 bound values per statement: insert rows one statement each, split id lists with `chunks()`.
- Every admin write is a server action in `app/(admin)/admin/actions.ts` that calls `requireAdmin()` first
  (owner-only things use `requireAdmin({ owner: true })`), validates with zod, logs with `logActivity`,
  and calls `updateTag("catalog" | "content" | "settings")`.
- No em or en dashes anywhere customers can see (copy, data, placeholders). `noDashes()` / `cleanHtml()` enforce it on save.
- Mobile first: every new screen must pass `npm run audit:mobile` (no sideways scroll, 40px taps).
- Motion: CSS only, and covered by the prefers-reduced-motion rule in `app/(shop)/shop.css`.
- `data/wp-export/` holds customer data: never commit it. Never edit the client's WordPress (read only).
- Marketplace: sellers live in `sellers` (role `seller`); products/lines carry `seller_id`; visibility is the `visible` fragment in `lib/catalog.ts`; commission is frozen per order line; seller actions check ownership. `npm run smoke` (98 checks, self-contained) plays shopper, seller and admin.
- No AI co-author lines in commits.
- Do not push or deploy unless the user explicitly asks. The Cloudflare account is shared with other live apps.
