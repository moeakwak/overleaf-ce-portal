import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/unit/setup.ts"],
    timeout: 10000,
    include: [
      "test/**/*.{test,spec}.ts",
      "!test/integration/**"  // Exclude integration tests
    ],
    pool: "forks",  // Use forks for better test isolation
    poolOptions: {
      forks: {
        singleFork: false  // Run each test file in a separate process
      }
    }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
