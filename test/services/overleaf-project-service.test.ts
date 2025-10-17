import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OverleafInstance } from "@/server/overleaf/instance";
import {
  createMockDockerExecutor,
  mockErrorResult,
  mockSuccessResult,
} from "../mocks/docker";
import {
  createMockProjectRepository,
  createMockSessionRepository,
  createMockUserRepository,
  mockProject,
  mockUser,
} from "../mocks/mongodb";

type OverleafProjectServiceType =
  typeof import("@/server/overleaf/services/project.service");

let OverleafProjectService: OverleafProjectServiceType["OverleafProjectService"];

let projectRepoMock = createMockProjectRepository();
let userRepoMock = createMockUserRepository();
let sessionRepoMock = createMockSessionRepository();

const projectRepoFactory = vi.fn(
  (_instance?: OverleafInstance) => projectRepoMock,
);
const userRepoFactory = vi.fn((_instance?: OverleafInstance) => userRepoMock);
const sessionRepoFactory = vi.fn(
  (_instance?: OverleafInstance) => sessionRepoMock,
);

vi.mock("@/server/overleaf/repositories/project.repository", () => ({
  OverleafProjectRepository: vi
    .fn()
    .mockImplementation((instance: OverleafInstance) =>
      projectRepoFactory(instance),
    ),
}));

vi.mock("@/server/overleaf/repositories/user.repository", () => ({
  OverleafUserRepository: vi
    .fn()
    .mockImplementation((instance: OverleafInstance) =>
      userRepoFactory(instance),
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
  ({ OverleafProjectService } = await import(
    "@/server/overleaf/services/project.service"
  ));
});

describe("OverleafProjectService", () => {
  let dockerExecutorMock = createMockDockerExecutor();
  let instanceMock: OverleafInstance;
  let projectService: InstanceType<typeof OverleafProjectService>;

  beforeEach(() => {
    vi.clearAllMocks();

    projectRepoMock = createMockProjectRepository();
    userRepoMock = createMockUserRepository();
    sessionRepoMock = createMockSessionRepository();
    dockerExecutorMock = createMockDockerExecutor();

    instanceMock = {
      getDockerExecutor: vi.fn(() => dockerExecutorMock),
    } as unknown as OverleafInstance;

    projectService = new OverleafProjectService(instanceMock);
  });

  describe("exportUserProjects", () => {
    it("exports projects when user and project exist", async () => {
      userRepoMock.findById.mockResolvedValue(mockUser);
      projectRepoMock.findById.mockResolvedValue(mockProject);
      dockerExecutorMock.exportUserProjects.mockResolvedValue(
        mockSuccessResult,
      );

      const result = await projectService.exportUserProjects({
        userId: mockUser._id,
        projectId: mockProject._id,
        outputPath: "/tmp/export.zip",
      });

      expect(result.success).toBe(true);
      expect(dockerExecutorMock.exportUserProjects).toHaveBeenCalledWith({
        userId: mockUser._id,
        projectId: mockProject._id,
        outputPath: "/tmp/export.zip",
        exportAll: undefined,
        outputDir: undefined,
      });
    });

    it("returns error if user missing", async () => {
      userRepoMock.findById.mockResolvedValue(null);

      const result = await projectService.exportUserProjects({
        userId: "missing",
        outputPath: "/tmp/export.zip",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(dockerExecutorMock.exportUserProjects).not.toHaveBeenCalled();
    });

    it("returns error if docker execution fails", async () => {
      userRepoMock.findById.mockResolvedValue(mockUser);
      dockerExecutorMock.exportUserProjects.mockResolvedValue(mockErrorResult);

      const result = await projectService.exportUserProjects({
        userId: mockUser._id,
        exportAll: true,
        outputPath: "/exports",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockErrorResult.stderr);
      expect(dockerExecutorMock.exportUserProjects).toHaveBeenCalledWith({
        userId: mockUser._id,
        projectId: undefined,
        outputPath: "/exports",
        exportAll: true,
        outputDir: "/exports",
      });
    });
  });

  describe("listProjects", () => {
    it("aggregates owner information and pagination", async () => {
      projectRepoMock.findMany.mockResolvedValue([mockProject]);
      projectRepoMock.count.mockResolvedValue(1);
      userRepoMock.findByIds.mockResolvedValue([mockUser]);

      const result = await projectService.listProjects({
        limit: 10,
        offset: 0,
        ownerId: mockUser._id,
        nameFilter: "Test",
        sortBy: "lastUpdated",
        sortOrder: "desc",
      });

      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.projects[0].ownerInfo).toEqual(mockUser);
      expect(projectRepoMock.findMany).toHaveBeenCalledWith(
        {
          owner_ref: mockUser._id,
          name: { $regex: "Test", $options: "i" },
        },
        { skip: 0, limit: 10, sort: { lastUpdated: -1 } },
      );
    });

    it("handles repository errors gracefully", async () => {
      projectRepoMock.findMany.mockRejectedValue(new Error("mongo down"));

      const result = await projectService.listProjects();

      expect(result).toEqual({ projects: [], total: 0, hasMore: false });
    });
  });

  describe("getProjectStats", () => {
    it("returns aggregated statistics", async () => {
      projectRepoMock.count.mockResolvedValueOnce(12);
      projectRepoMock.countProjectsUpdatedAfter
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3);
      userRepoMock.count.mockResolvedValueOnce(4);

      const stats = await projectService.getProjectStats();

      expect(stats).toEqual({
        totalProjects: 12,
        activeProjects: 7,
        projectsThisMonth: 3,
        averageProjectsPerUser: 3,
      });
    });

    it("falls back to zeros on failure", async () => {
      projectRepoMock.count.mockRejectedValue(new Error("boom"));

      const stats = await projectService.getProjectStats();

      expect(stats).toEqual({
        totalProjects: 0,
        activeProjects: 0,
        projectsThisMonth: 0,
        averageProjectsPerUser: 0,
      });
    });
  });

  describe("getProjectWithRealtimeInfo", () => {
    it("combines project and realtime metadata", async () => {
      const head = { projectVersion: "1" };
      const changes = [{ update: true }];
      const persisted = { version: 5, time: "now", expireTime: "later" };

      projectRepoMock.findById.mockResolvedValue(mockProject);
      sessionRepoMock.getDocumentHead.mockResolvedValue(head);
      sessionRepoMock.getDocumentVersion.mockResolvedValue(2);
      sessionRepoMock.getDocumentChangesCount.mockResolvedValue(10);
      sessionRepoMock.getRecentDocumentChanges.mockResolvedValue(changes);
      sessionRepoMock.getPersistedVersionInfo.mockResolvedValue(persisted);

      const result = await projectService.getProjectWithRealtimeInfo(
        mockProject._id,
      );

      expect(result.project).toEqual(mockProject);
      expect(result.realtimeInfo).toEqual({
        documentHead: head,
        version: 2,
        changesCount: 10,
        recentChanges: changes,
        persistedVersionInfo: persisted,
      });
    });
  });

  describe("searchProjects", () => {
    it("delegates to repository with regex filter", async () => {
      projectRepoMock.findMany.mockResolvedValue([mockProject]);

      const projects = await projectService.searchProjects("demo", 5);

      expect(projects).toEqual([mockProject]);
      expect(projectRepoMock.findMany).toHaveBeenCalledWith(
        { name: { $regex: "demo", $options: "i" } },
        { limit: 5 },
      );
    });
  });
});
