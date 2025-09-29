import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockDockerExecutor,
  mockErrorResult,
  mockSuccessResult,
} from "../mocks/docker";
import { mockMongoManager, mockUser } from "../mocks/mongodb";
import { mockRedisManager, mockSessionData } from "../mocks/redis";

// Mock the managers before importing UserService
vi.mock("@/server/managers/docker-executor", () => ({
  DockerCommandExecutor: {
    getInstance: () => mockDockerExecutor,
  },
}));

vi.mock("@/server/managers/mongodb", () => ({
  MongoDBManager: {
    getInstance: () => mockMongoManager,
  },
}));

vi.mock("@/server/managers/redis", () => ({
  RedisManager: {
    getInstance: () => mockRedisManager,
  },
}));

// Import after mocking
const { UserService } = await import("@/server/services/user-service");

describe("UserService", () => {
  let userService: InstanceType<typeof UserService>;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService();
  });

  describe("createUser", () => {
    it("should create user successfully", async () => {
      // Setup mocks
      mockMongoManager.findUserByEmail.mockResolvedValue(null); // User doesn't exist
      mockDockerExecutor.createUser.mockResolvedValue(mockSuccessResult);
      mockMongoManager.findUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      const result = await userService.createUser({
        email: "test@example.com",
        isAdmin: false,
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockDockerExecutor.createUser).toHaveBeenCalledWith(
        "test@example.com",
        false,
      );
    });

    it("should fail if user already exists", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(mockUser);

      const result = await userService.createUser({
        email: "test@example.com",
        isAdmin: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("User with this email already exists");
      expect(mockDockerExecutor.createUser).not.toHaveBeenCalled();
    });

    it("should handle docker execution failure", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(null);
      mockDockerExecutor.createUser.mockResolvedValue(mockErrorResult);

      const result = await userService.createUser({
        email: "test@example.com",
        isAdmin: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockErrorResult.stderr);
    });

    it("should handle unexpected errors", async () => {
      mockMongoManager.findUserByEmail.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await userService.createUser({
        email: "test@example.com",
        isAdmin: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(mockUser);
      mockDockerExecutor.deleteUser.mockResolvedValue(mockSuccessResult);

      const result = await userService.deleteUser("test@example.com", false);

      expect(result.success).toBe(true);
      expect(mockDockerExecutor.deleteUser).toHaveBeenCalledWith(
        "test@example.com",
        false,
      );
    });

    it("should fail if user does not exist", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(null);

      const result = await userService.deleteUser("test@example.com", false);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(mockDockerExecutor.deleteUser).not.toHaveBeenCalled();
    });

    it("should handle docker execution failure", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(mockUser);
      mockDockerExecutor.deleteUser.mockResolvedValue(mockErrorResult);

      const result = await userService.deleteUser("test@example.com", false);

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockErrorResult.stderr);
    });
  });

  describe("getUserByEmail", () => {
    it("should return user when found", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockMongoManager.findUserByEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
    });

    it("should return null when user not found", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      mockMongoManager.findUserByEmail.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await userService.getUserByEmail("test@example.com");

      expect(result).toBeNull();
    });
  });

  describe("listUsers", () => {
    it("should list users with pagination", async () => {
      const mockResult = {
        users: [mockUser],
        total: 1,
        hasMore: false,
      };
      mockMongoManager.listUsers.mockResolvedValue(mockResult);

      const result = await userService.listUsers({ limit: 10, offset: 0 });

      expect(result).toEqual(mockResult);
      expect(mockMongoManager.listUsers).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    it("should handle database errors gracefully", async () => {
      mockMongoManager.listUsers.mockRejectedValue(new Error("Database error"));

      const result = await userService.listUsers();

      expect(result).toEqual({ users: [], total: 0, hasMore: false });
    });
  });

  describe("getUserStats", () => {
    it("should return user statistics", async () => {
      const mockStats = {
        totalUsers: 100,
        adminUsers: 5,
        activeUsers: 80,
        newUsersThisMonth: 10,
      };
      mockMongoManager.getUserStats.mockResolvedValue(mockStats);

      const result = await userService.getUserStats();

      expect(result).toEqual(mockStats);
    });

    it("should handle database errors gracefully", async () => {
      mockMongoManager.getUserStats.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await userService.getUserStats();

      expect(result).toEqual({
        totalUsers: 0,
        adminUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      });
    });
  });

  describe("getUserSessions", () => {
    it("should return user sessions", async () => {
      const mockSessions = [{ sessionId: "session1", data: mockSessionData }];
      mockRedisManager.getUserSessions.mockResolvedValue(mockSessions);

      const result = await userService.getUserSessions("user123");

      expect(result).toEqual(mockSessions);
      expect(mockRedisManager.getUserSessions).toHaveBeenCalledWith("user123");
    });

    it("should handle Redis errors gracefully", async () => {
      mockRedisManager.getUserSessions.mockRejectedValue(
        new Error("Redis error"),
      );

      const result = await userService.getUserSessions("user123");

      expect(result).toEqual([]);
    });
  });

  describe("searchUsers", () => {
    it("should search users by email pattern", async () => {
      const mockResult = {
        users: [mockUser],
        total: 1,
        hasMore: false,
      };
      mockMongoManager.listUsers.mockResolvedValue(mockResult);

      const result = await userService.searchUsers("test", 10);

      expect(result).toEqual([mockUser]);
      expect(mockMongoManager.listUsers).toHaveBeenCalledWith({
        emailFilter: "test",
        limit: 10,
      });
    });
  });

  describe("upgradeUserFeatures", () => {
    it("should upgrade user features successfully", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(mockUser);
      mockDockerExecutor.upgradeUserFeatures.mockResolvedValue(
        mockSuccessResult,
      );

      const features = { collaborators: 10 };
      const result = await userService.upgradeUserFeatures(
        "test@example.com",
        features,
      );

      expect(result.success).toBe(true);
      expect(mockDockerExecutor.upgradeUserFeatures).toHaveBeenCalledWith(
        "test@example.com",
        features,
      );
    });

    it("should fail if user does not exist", async () => {
      mockMongoManager.findUserByEmail.mockResolvedValue(null);

      const result = await userService.upgradeUserFeatures("test@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });
  });

  describe("clearExpiredSessions", () => {
    it("should clear expired sessions", async () => {
      mockRedisManager.clearExpiredSessions.mockResolvedValue(5);

      const result = await userService.clearExpiredSessions();

      expect(result).toBe(5);
      expect(mockRedisManager.clearExpiredSessions).toHaveBeenCalled();
    });

    it("should handle Redis errors gracefully", async () => {
      mockRedisManager.clearExpiredSessions.mockRejectedValue(
        new Error("Redis error"),
      );

      const result = await userService.clearExpiredSessions();

      expect(result).toBe(0);
    });
  });
});
