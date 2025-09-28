import { defineConfig } from "drizzle-kit";
import { env } from "./lib/env";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
