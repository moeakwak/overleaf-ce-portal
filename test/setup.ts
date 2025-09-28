// Test setup file for vitest
import { vi } from "vitest";

// Mock environment variables for testing
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "file:./test.db",
    BETTER_AUTH_SECRET: "test-secret",
    DOCKER_SOCKET_PATH: "/var/run/docker.sock",
    SHARELATEX_CONTAINER: "sharelatex",
    MONGODB_URL: "mongodb://localhost:27017/sharelatex",
    REDIS_URL: "redis://localhost:6379",
  },
}));

// Setup globals
global.console = {
  ...console,
  // Suppress logs during tests
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
