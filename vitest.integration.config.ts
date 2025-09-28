import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/integration/setup.ts"],
    timeout: 30000, // Longer timeout for integration tests
    include: [
      "test/integration/**/*.{test,spec}.ts"
    ],
    pool: "forks",  // Use separate process for each test
    poolOptions: {
      forks: {
        singleFork: true  // Use single fork for integration tests to share connections
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});