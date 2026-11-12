import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns db/schema.ts into SQL migrations under drizzle/ (SQLite, for D1).
// Applied by `npm run db` (local copy) and `npm run db:migrate:remote` (the real D1).
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./drizzle",
});
