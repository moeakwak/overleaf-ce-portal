import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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
import { mockSessionData } from "../mocks/redis";

type OverleafUserServiceType =
  typeof import("@/server/overleaf/services/user.service");

let OverleafUserService: OverleafUserServiceType["OverleafUserService"];

let userRepoMock = createMockUserRepository();
let projectRepoMock = createMockProjectRepository();
let sessionRepoMock = createMockSessionRepository();

const userRepoFactory = vi.fn(() => userRepoMock);
const projectRepoFactory = vi.fn(() => projectRepoMock);
const sessionRepoFactory = vi.fn(() => sessionRepoMock);

vi.mock("@/server/overleaf/repositories/user.repository", () => ({
  OverleafUserRepository: vi.fn().mockImplementation(() => userRepoFactory()),
}));

vi.mock("@/server/overleaf/repositories/project.repository", () => ({
  OverleafProjectRepository: vi
    .fn()
    .mockImplementation(() => projectRepoFactory()),
}));

vi.mock("@/server/overleaf/repositories/session.repository", () => ({
  OverleafSessionRepository: vi
    .fn()
    .mockImplementation(() => sessionRepoFactory()),
}));

beforeAll(async () => {
  ({ OverleafUserService } = await import(
    "@/server/overleaf/services/user.service"
  ));
});

describe("OverleafUserService", () => {
  let dockerExecutorMock = createMockDockerExecutor();
  let instanceMock: OverleafInstance;
  let userService: InstanceType<typeof OverleafUserService>;

  beforeEach(() => {
    vi.clearAllMocks();

    userRepoMock = createMockUserRepository();
    projectRepoMock = createMockProjectRepository();
    sessionRepoMock = createMockSessionRepository();
    dockerExecutorMock = createMockDockerExecutor();

    instanceMock = {
      getDockerExecutor: vi.fn(() => dockerExecutorMock),
    } as unknown as OverleafInstance;

    userService = new OverleafUserService(instanceMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createUser", () => {
    it("creates a new user when no existing record", async () => {
      vi.useFakeTimers();

      userRepoMock.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      dockerExecutorMock.createUser.mockResolvedValue(mockSuccessResult);

      const createPromise = userService.createUser({
        email: "new-user@example.com",
        isAdmin: true,
      });

      await vi.runAllTimersAsync();
      const result = await createPromise;

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(dockerExecutorMock.createUser).toHaveBeenCalledWith(
        "new-user@example.com",
        true,
      );
      expect(userRepoMock.findByEmail).toHaveBeenCalledTimes(2);
    });

    it("fails when user already exists", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.createUser({
        email: mockUser.email,
        isAdmin: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("User with this email already exists");
      expect(dockerExecutorMock.createUser).not.toHaveBeenCalled();
    });

    it("surfaces docker execution failure", async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);
      dockerExecutorMock.createUser.mockResolvedValue(mockErrorResult);

      const result = await userService.createUser({
        email: "failing@example.com",
        isAdmin: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockErrorResult.stderr);
    });
  });

  describe("deleteUser", () => {
    it("deletes an existing user", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);
      dockerExecutorMock.deleteUser.mockResolvedValue(mockSuccessResult);

      const result = await userService.deleteUser(mockUser.email, true);

      expect(result.success).toBe(true);
      expect(dockerExecutorMock.deleteUser).toHaveBeenCalledWith(
        mockUser.email,
        true,
      );
    });

    it("fails when user is missing", async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      const result = await userService.deleteUser("missing@example.com", false);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(dockerExecutorMock.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe("updateAdminStatus", () => {
    it("updates admin flag when user exists", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);
      userRepoMock.updateAdminStatus.mockResolvedValue(true);

      const result = await userService.updateAdminStatus(mockUser.email, true);

      expect(result.success).toBe(true);
      expect(userRepoMock.updateAdminStatus).toHaveBeenCalledWith(
        mockUser.email,
        true,
      );
    });

    it("returns error when user not found", async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      const result = await userService.updateAdminStatus(
        "missing@example.com",
        true,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(userRepoMock.updateAdminStatus).not.toHaveBeenCalled();
    });

    it("returns error when repository update fails", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);
      userRepoMock.updateAdminStatus.mockResolvedValue(false);

      const result = await userService.updateAdminStatus(mockUser.email, true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update admin status");
    });
  });

  describe("setUserPassword", () => {
    it("updates password using bcrypt and repository", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);
      userRepoMock.setPassword.mockResolvedValue(true);

      const result = await userService.setUserPassword(
        mockUser.email,
        "newPassword123",
      );

      expect(result.success).toBe(true);
      expect(userRepoMock.setPassword).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringMatching(/^\$2[aby]\$.{56}$/), // bcrypt hash pattern
      );
    });

    it("returns error when repository update fails", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);
      userRepoMock.setPassword.mockResolvedValue(false);

      const result = await userService.setUserPassword(
        mockUser.email,
        "newPassword123",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update password");
    });

    it("returns error when user missing", async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      const result = await userService.setUserPassword(
        "missing@example.com",
        "newPassword123",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(userRepoMock.setPassword).not.toHaveBeenCalled();
    });
  });

  describe("user retrieval", () => {
    it("returns user by email", async () => {
      userRepoMock.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(userRepoMock.findByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it("handles missing user gracefully", async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail("missing@example.com");

      expect(result).toBeNull();
    });
  });

  describe("listUsers", () => {
    it("builds filter and pagination metadata", async () => {
      const users = [mockUser];
      userRepoMock.findMany.mockResolvedValue(users);
      userRepoMock.count.mockResolvedValue(3);

      const result = await userService.listUsers({
        limit: 1,
        offset: 0,
        emailFilter: "@example.com",
        adminOnly: true,
      });

      expect(result).toEqual({ users, total: 3, hasMore: true });
      expect(userRepoMock.findMany).toHaveBeenCalledWith(
        {
          email: { $regex: "@example.com", $options: "i" },
          isAdmin: true,
        },
        { skip: 0, limit: 1, sort: { signUpDate: -1 } },
      );
      expect(userRepoMock.count).toHaveBeenCalledWith({
        email: { $regex: "@example.com", $options: "i" },
        isAdmin: true,
      });
    });

    it("returns empty result on failure", async () => {
      userRepoMock.findMany.mockRejectedValue(new Error("database down"));

      const result = await userService.listUsers();

      expect(result).toEqual({ users: [], total: 0, hasMore: false });
    });
  });

  describe("getUserStats", () => {
    it("aggregates statistics via repository", async () => {
      userRepoMock.count.mockResolvedValueOnce(10);
      userRepoMock.countAdmins.mockResolvedValueOnce(2);
      userRepoMock.countActiveUsers.mockResolvedValueOnce(5);
      userRepoMock.countUsersSignedUpAfter.mockResolvedValueOnce(3);

      const result = await userService.getUserStats();

      expect(result).toEqual({
        totalUsers: 10,
        adminUsers: 2,
        activeUsers: 5,
        newUsersThisMonth: 3,
      });
    });

    it("falls back to zeros on errors", async () => {
      userRepoMock.count.mockRejectedValue(new Error("boom"));

      const result = await userService.getUserStats();

      expect(result).toEqual({
        totalUsers: 0,
        adminUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      });
    });
  });

  describe("session operations", () => {
    it("returns all active sessions", async () => {
      const sessions = [
        { sessionId: "a", data: mockSessionData },
        { sessionId: "b", data: mockSessionData },
      ];
      sessionRepoMock.getAllSessions.mockResolvedValue(sessions);

      const result = await userService.getActiveSessions();

      expect(result).toEqual(sessions);
      expect(sessionRepoMock.getAllSessions).toHaveBeenCalled();
    });

    it("computes session statistics", async () => {
      const expired = {
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
        expired,
      ]);

      const stats = await userService.getSessionStats();

      expect(stats).toEqual({
        totalSessions: 2,
        authenticatedSessions: 2,
        expiredSessions: 1,
      });
    });

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

      const cleared = await userService.clearExpiredSessions();

      expect(cleared).toBe(1);
      expect(sessionRepoMock.deleteSessions).toHaveBeenCalledWith(["expired"]);
    });
  });

  describe("searchUsers", () => {
    it("delegates to repository with regex filter", async () => {
      const users = [mockUser];
      userRepoMock.findMany.mockResolvedValue(users);

      const result = await userService.searchUsers("test", 5);

      expect(result).toEqual(users);
      expect(userRepoMock.findMany).toHaveBeenCalledWith(
        { email: { $regex: "test", $options: "i" } },
        { limit: 5 },
      );
    });
  });

  describe("getUserWithProjectsSummary", () => {
    it("returns project stats for user", async () => {
      userRepoMock.findById.mockResolvedValue(mockUser);
      projectRepoMock.findByOwner.mockResolvedValue([
        mockProject,
        { ...mockProject, _id: "second", lastUpdated: new Date("2024-01-01") },
      ]);

      const result = await userService.getUserWithProjectsSummary("user123");

      expect(result.user).toEqual(mockUser);
      expect(result.projectCount).toBe(2);
      expect(result.lastProjectUpdate).toBeInstanceOf(Date);
      expect(projectRepoMock.findByOwner).toHaveBeenCalledWith("user123");
    });

    it("handles repository failures gracefully", async () => {
      userRepoMock.findById.mockRejectedValue(new Error("mongo unavailable"));

      const result = await userService.getUserWithProjectsSummary("user123");

      expect(result).toEqual({ user: null, projectCount: 0 });
    });
  });
});
