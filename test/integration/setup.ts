// Integration test setup - loads real environment variables
// IMPORTANT: This must be the very first import in the setup chain
import { config } from "dotenv";

// Load environment variables from .env.local BEFORE any other imports
config({ path: ".env.local" });

// Verify environment variables are loaded
console.log("Setting up integration tests with real environment");
console.log("Environment check:");
console.log("- MONGODB_URL:", process.env.MONGODB_URL);
console.log("- REDIS_URL:", process.env.REDIS_URL);
console.log("- DOCKER_SOCKET_PATH:", process.env.DOCKER_SOCKET_PATH);
console.log("- SHARELATEX_CONTAINER:", process.env.SHARELATEX_CONTAINER);

// Set NODE_ENV to test if not set
if (!process.env.NODE_ENV) {
  Object.assign(process.env, { NODE_ENV: "test" });
}

// Export a helper to verify env is available
export function verifyEnvironment() {
  const required = [
    "MONGODB_URL",
    "REDIS_URL",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for integration tests: ${missing.join(", ")}\nPlease ensure .env.local file exists and contains these variables.`,
    );
  }

  return true;
}
