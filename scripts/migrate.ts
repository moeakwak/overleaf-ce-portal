import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "../lib/db";

async function main() {
  console.info("[migrate] Applying pending migrations...");
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  console.info("[migrate] Migrations applied successfully.");
}

main()
  .catch((error) => {
    console.error("[migrate] Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.$client.close();
  });
