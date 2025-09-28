// Unit test setup file - mocks all external dependencies
import { vi } from "vitest";

// Mock the env module for unit tests
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "file:./test.db",
    BETTER_AUTH_SECRET: "test-secret",
    DOCKER_SOCKET_PATH: "/var/run/docker.sock",
    SHARELATEX_CONTAINER: "sharelatex",
    MONGODB_URL: "mongodb://localhost:27017/sharelatex",
    REDIS_URL: "redis://localhost:6379",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock dockerode for unit tests
vi.mock("dockerode", () => {
  const MockDocker = vi.fn().mockImplementation(() => ({
    getContainer: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        start: vi.fn().mockResolvedValue({}),
      }),
    }),
  }));
  return { default: MockDocker };
});

// Mock MongoDB for unit tests
vi.mock("mongodb", () => {
  const MockMongoClient = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          sort: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        }),
        findOne: vi.fn().mockResolvedValue(null),
        countDocuments: vi.fn().mockResolvedValue(0),
      }),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  }));

  return {
    MongoClient: MockMongoClient,
  };
});

// Mock Redis/ioredis for unit tests
vi.mock("ioredis", () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue("PONG"),
    keys: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    hgetall: vi.fn().mockResolvedValue({}),
    dbsize: vi.fn().mockResolvedValue(0),
    info: vi.fn().mockResolvedValue(""),
    quit: vi.fn().mockResolvedValue("OK"),
    on: vi.fn(),
  }));

  return {
    default: MockRedis,
    Redis: MockRedis,
  };
});

// Suppress console output during unit tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
