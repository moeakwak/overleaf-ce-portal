import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables schema.
   * These are only available on the server-side.
   */
  server: {
    // Better Auth Configuration
    BETTER_AUTH_SECRET: z.string().min(1, "Better Auth secret is required"),

    // Database Configuration
    DATABASE_URL: z.string().min(1, "Database URL is required"),

    // Node Environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
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
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

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
