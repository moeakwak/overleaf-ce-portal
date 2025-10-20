import "dotenv/config";

import { auth, USER_ROLES } from "../lib/auth";
import { env } from "../lib/env";

async function main() {
  const email = env.INITIAL_SUPERADMIN_EMAIL;
  const password = env.INITIAL_SUPERADMIN_PASSWORD;
  const passwordLoginEnabled = env.ENABLE_PASSWORD_LOGIN;

  if (!USER_ROLES.includes("super-admin")) {
    throw new Error('The role "super-admin" is not registered in USER_ROLES.');
  }

  const authContext = await auth.$context;
  const { internalAdapter, password: passwordUtils } = authContext;

  let existingRecord = await internalAdapter.findUserByEmail(email, {
    includeAccounts: true,
  });

  if (!existingRecord) {
    if (passwordLoginEnabled) {
      console.log(
        `Creating super admin account for ${email} with password login...`,
      );
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

      existingRecord = await internalAdapter.findUserByEmail(email, {
        includeAccounts: true,
      });
    } else {
      console.log(
        `Creating super admin account for ${email} without password login...`,
      );
      const createdUser = await internalAdapter.createUser({
        email: email.toLowerCase(),
        name: "Super Admin",
        role: "super-admin",
        emailVerified: true,
      });

      if (!createdUser) {
        throw new Error("Failed to create the super admin account.");
      }

      existingRecord = {
        user: createdUser,
        accounts: [],
      };
    }
  } else {
    console.log(`User ${email} already exists. Ensuring super admin role...`);
  }

  const targetUser = existingRecord?.user;

  if (!targetUser) {
    throw new Error("Failed to load the super admin account after creation.");
  }

  await internalAdapter.updateUser(targetUser.id, { role: "super-admin" });

  if (passwordLoginEnabled) {
    const hashedPassword = await passwordUtils.hash(password);
    const credentialAccount = existingRecord?.accounts?.find(
      (account) => account.providerId === "credential",
    );

    if (!credentialAccount) {
      await internalAdapter.linkAccount({
        userId: targetUser.id,
        providerId: "credential",
        accountId: targetUser.id,
        password: hashedPassword,
      });
    } else {
      await internalAdapter.updatePassword(targetUser.id, hashedPassword);
    }
  }

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
