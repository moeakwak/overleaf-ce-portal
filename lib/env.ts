import { createEnv } from "@t3-oss/env-nextjs";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const booleanWithDefault = (defaultValue: boolean) =>
  z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        if (["true", "1", "yes", "on"].includes(normalized)) {
          return true;
        }

        if (["false", "0", "no", "off"].includes(normalized)) {
          return false;
        }
      }

      if (typeof value === "number") {
        return value !== 0;
      }

      return value;
    }, z.boolean())
    .default(defaultValue);

// Load environment variables before validation
// This is crucial for non-Next.js contexts (like drizzle-kit)
// Next.js automatically loads .env files, but standalone scripts don't
loadEnv({ path: ".env.local" });
loadEnv();

export const env = createEnv({
  /**
   * Server-side environment variables schema.
   * These are only available on the server-side.
   */
  server: {
    // Better Auth Configuration
    BETTER_AUTH_SECRET: z.string().min(1, "Better Auth secret is required"),
    BETTER_AUTH_TRUSTED_ORIGINS: z.preprocess((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const origins = value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

      return origins.length > 0 ? origins : undefined;
    }, z
      .array(z.string().url("Better Auth trusted origins must be valid URLs"))
      .optional()),
    INITIAL_SUPERADMIN_EMAIL: z
      .string()
      .email("Initial super admin email must be valid")
      .default("admin@example.com"),
    INITIAL_SUPERADMIN_PASSWORD: z
      .string()
      .min(8, "Initial super admin password must be at least 8 characters")
      .default("ChangeMe123!"),

    // Database Configuration
    DATABASE_URL: z.string().min(1, "Database URL is required"),

    // Overleaf CE Integration
    DOCKER_SOCKET_PATH: z.string().default("/var/run/docker.sock"),
    SHARELATEX_CONTAINER: z.string().default("sharelatex"),
    MONGODB_URL: z.string().min(1, "MongoDB URL is required"),
    REDIS_URL: z.string().min(1, "Redis URL is required"),
    OVERLEAF_TOOLKIT_PATH: z.string().optional(),

    // Node Environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Authentication toggles
    ENABLE_PASSWORD_LOGIN: booleanWithDefault(true),
    ENABLE_OIDC_LOGIN: booleanWithDefault(false),

    // Generic OIDC Provider Configuration
    OIDC_PROVIDER_ID: z.string().default("oidc-provider"),
    OIDC_PROVIDER_NAME: z.string().default("OIDC"),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    OIDC_DISCOVERY_URL: z.string().url().optional(),
    OIDC_SCOPES: z.string().optional(),
  },

  /**
   * Client-side environment variables schema.
   * These are exposed to the client-side.
   */
  client: {
    // App Configuration
    NEXT_PUBLIC_APP_URL: z.string().url("App URL must be a valid URL"),
  },

  /**
   * Runtime environment variables mapping.
   * This tells the library which environment variables to read.
   */
  runtimeEnv: {
    // Server-side variables
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    INITIAL_SUPERADMIN_EMAIL: process.env.INITIAL_SUPERADMIN_EMAIL,
    INITIAL_SUPERADMIN_PASSWORD: process.env.INITIAL_SUPERADMIN_PASSWORD,
    DATABASE_URL: process.env.DATABASE_URL,
    DOCKER_SOCKET_PATH: process.env.DOCKER_SOCKET_PATH,
    SHARELATEX_CONTAINER: process.env.SHARELATEX_CONTAINER,
    MONGODB_URL: process.env.MONGODB_URL,
    REDIS_URL: process.env.REDIS_URL,
    OVERLEAF_TOOLKIT_PATH: process.env.OVERLEAF_TOOLKIT_PATH,
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_PASSWORD_LOGIN: process.env.ENABLE_PASSWORD_LOGIN,
    ENABLE_OIDC_LOGIN: process.env.ENABLE_OIDC_LOGIN,
    OIDC_PROVIDER_ID: process.env.OIDC_PROVIDER_ID,
    OIDC_PROVIDER_NAME: process.env.OIDC_PROVIDER_NAME,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    OIDC_DISCOVERY_URL: process.env.OIDC_DISCOVERY_URL,
    OIDC_SCOPES: process.env.OIDC_SCOPES,

    // Client-side variables
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation of environment variables in certain scenarios.
   * This is useful for build-time environments where some variables might not be available.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

if (!env.ENABLE_PASSWORD_LOGIN && !env.ENABLE_OIDC_LOGIN) {
  throw new Error(
    "ENABLE_PASSWORD_LOGIN and ENABLE_OIDC_LOGIN cannot both be disabled",
  );
}
