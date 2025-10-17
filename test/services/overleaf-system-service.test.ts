import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OverleafInstance } from "@/server/overleaf/instance";
import { createMockDockerExecutor } from "../mocks/docker";
import {
  createMockProjectRepository,
  createMockSessionRepository,
  createMockUserRepository,
} from "../mocks/mongodb";
import { mockSessionData } from "../mocks/redis";

type OverleafSystemServiceType =
  typeof import("@/server/overleaf/services/system.service");

let OverleafSystemService: OverleafSystemServiceType["OverleafSystemService"];

const dockerExecutorMock = createMockDockerExecutor();
let userRepoMock = createMockUserRepository();
let projectRepoMock = createMockProjectRepository();
let sessionRepoMock = createMockSessionRepository();

const userRepoFactory = vi.fn((_instance?: OverleafInstance) => userRepoMock);
const projectRepoFactory = vi.fn(
  (_instance?: OverleafInstance) => projectRepoMock,
);
const sessionRepoFactory = vi.fn(
  (_instance?: OverleafInstance) => sessionRepoMock,
);

vi.mock("@/server/overleaf/repositories/user.repository", () => ({
  OverleafUserRepository: vi
    .fn()
    .mockImplementation((instance: OverleafInstance) =>
      userRepoFactory(instance),
    ),
}));

vi.mock("@/server/overleaf/repositories/project.repository", () => ({
  OverleafProjectRepository: vi
    .fn()
    .mockImplementation((instance: OverleafInstance) =>
      projectRepoFactory(instance),
    ),
}));

vi.mock("@/server/overleaf/repositories/session.repository", () => ({
  OverleafSessionRepository: vi
    .fn()
    .mockImplementation((instance: OverleafInstance) =>
      sessionRepoFactory(instance),
    ),
}));

beforeAll(async () => {
  ({ OverleafSystemService } = await import(
    "@/server/overleaf/services/system.service"
  ));
});

describe("OverleafSystemService", () => {
  let instanceMock: OverleafInstance;
  let systemService: InstanceType<typeof OverleafSystemService>;
  let mongoDbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    userRepoMock = createMockUserRepository();
    projectRepoMock = createMockProjectRepository();
    sessionRepoMock = createMockSessionRepository();

    dockerExecutorMock.getContainerStatus = vi.fn().mockResolvedValue({
      isRunning: true,
      state: "running",
    });
    dockerExecutorMock.checkMongoDB = vi
      .fn()
      .mockResolvedValue({ success: true, stdout: "mongo ok" });
    dockerExecutorMock.checkRedis = vi
      .fn()
      .mockResolvedValue({ success: true, stdout: "redis ok" });

    mongoDbMock = {
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      stats: vi.fn().mockResolvedValue({ dataSize: 2048 }),
      listCollections: vi.fn().mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([{ name: "users" }, { name: "projects" }]),
      }),
      collection: vi.fn((name: string) => ({
        countDocuments: vi.fn().mockResolvedValue(name === "users" ? 5 : 3),
        indexes: vi.fn().mockResolvedValue([{ name: `${name}_idx` }]),
      })),
    };

    instanceMock = {
      getDockerExecutor: vi.fn(() => dockerExecutorMock),
      getMongoDB: vi.fn(() => mongoDbMock),
    } as unknown as OverleafInstance;

    systemService = new OverleafSystemService(instanceMock);
  });

  describe("getSystemHealth", () => {
    it("reports healthy status when dependencies succeed", async () => {
      sessionRepoMock.ping.mockResolvedValue(12);
      sessionRepoMock.getCacheStats.mockResolvedValue({ totalKeys: 10 });

      const health = await systemService.getSystemHealth();

      expect(health.overall).toBe("healthy");
      expect(health.components.docker.status).toBe("healthy");
      expect(health.components.mongodb.connected).toBe(true);
      expect(health.components.redis.connected).toBe(true);
      expect(mongoDbMock.command).toHaveBeenCalledWith({ ping: 1 });
    });

    it("flags errors when docker check fails", async () => {
      dockerExecutorMock.getContainerStatus.mockRejectedValue(
        new Error("docker unavailable"),
      );

      const health = await systemService.getSystemHealth();

      expect(health.overall).toBe("error");
      expect(health.components.docker.status).toBe("error");
    });
  });

  describe("getSystemStats", () => {
    it("aggregates system-wide statistics", async () => {
      userRepoMock.count.mockResolvedValueOnce(4);
      userRepoMock.countAdmins.mockResolvedValueOnce(1);
      userRepoMock.countActiveUsers.mockResolvedValueOnce(3);
      userRepoMock.countUsersSignedUpAfter.mockResolvedValueOnce(2);
      projectRepoMock.count.mockResolvedValueOnce(12);
      projectRepoMock.countProjectsUpdatedAfter
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      sessionRepoMock.getAllSessions.mockResolvedValue([
        { sessionId: "a", data: mockSessionData },
      ]);
      sessionRepoMock.getCacheStats.mockResolvedValue({
        totalKeys: 20,
        sessionKeys: 5,
        documentKeys: 10,
        memoryUsage: 1024,
        connectedClients: 3,
      });

      const stats = await systemService.getSystemStats();

      expect(stats.users.totalUsers).toBe(4);
      expect(stats.projects.totalProjects).toBe(12);
      expect(stats.projects.activeProjects).toBe(5);
      expect(stats.projects.projectsThisMonth).toBe(2);
      expect(stats.sessions.totalSessions).toBe(1);
      expect(stats.cache.totalKeys).toBe(20);
      expect(stats.database.dbSize).toBe(2048);
    });
  });

  describe("performMaintenance", () => {
    it("clears expired sessions", async () => {
      const expiredSession = {
        sessionId: "expired",
        data: {
          ...mockSessionData,
          cookie: {
            ...mockSessionData.cookie,
            expires: new Date(Date.now() - 60_000).toISOString(),
          },
        },
      };
      sessionRepoMock.getAllSessions.mockResolvedValue([
        { sessionId: "active", data: mockSessionData },
        expiredSession,
      ]);
      sessionRepoMock.deleteSessions.mockResolvedValue(1);

      const result = await systemService.performMaintenance();

      expect(result.success).toBe(true);
      expect(result.results.expiredSessionsCleared).toBe(1);
      expect(sessionRepoMock.deleteSessions).toHaveBeenCalledWith(["expired"]);
    });
  });
});
