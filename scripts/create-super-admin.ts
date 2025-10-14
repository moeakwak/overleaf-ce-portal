import "dotenv/config";

import { eq } from "drizzle-orm";
import { auth, USER_ROLES } from "../lib/auth";
import { db } from "../lib/db";
import { user } from "../lib/db/schema";
import { env } from "../lib/env";

async function main() {
  const email = env.INITIAL_SUPERADMIN_EMAIL;
  const password = env.INITIAL_SUPERADMIN_PASSWORD;

  if (!USER_ROLES.includes("super-admin")) {
    throw new Error('The role "super-admin" is not registered in USER_ROLES.');
  }

  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existingUser) {
    console.log(`Creating super admin account for ${email}...`);
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Super Admin",
      },
    });

    if (!result?.user) {
      throw new Error("Failed to create the super admin account.");
    }
  } else {
    console.log(`User ${email} already exists. Ensuring super admin role...`);
  }

  await db
    .update(user)
    .set({ role: "super-admin" })
    .where(eq(user.email, email));

  console.log(`Super admin role ensured for ${email}.`);
}

main()
  .then(() => {
    console.log("Super admin setup completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to set up super admin:", error);
    process.exit(1);
  });
