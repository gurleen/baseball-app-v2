import { defineConfig } from "drizzle-kit";

// Introspection only: this project treats the database as owned by baseball-etl.
// `bun run db:pull` mirrors the "public" schema into src/server/db/schema.ts;
// never run `drizzle-kit push`/`migrate` against this config.
export default defineConfig({
  out: "./src/server/db",
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
