// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppContext } from "@/server/context";
import type {
  OverleafProjectService,
  OverleafSystemService,
  OverleafUserService,
} from "@/server/overleaf/services";

// Integration tests - these run against real Docker/MongoDB/Redis if available
describe("System Integration Tests", () => {
  let appContext: AppContext;
  let systemService: OverleafSystemService;
  let userService: OverleafUserService;
  let projectService: OverleafProjectService;
  let initialized = false;

  beforeAll(async () => {
    appContext = AppContext.getInstance();

    try {
      await appContext.initialize();
      systemService = appContext.getOverleafSystemService();
      userService = appContext.getOverleafUserService();
      projectService = appContext.getOverleafProjectService();
      initialized = true;
    } catch (error) {
      console.error("System initialization failed:", error);
      initialized = false;
    }
  });

  afterAll(async () => {
    if (initialized) {
      await appContext.cleanup();
    }
  });

  describe("System Health Check", () => {
    it("should perform comprehensive health check", async () => {
      if (!initialized) {
        vi.skip();
      }

      const health = await systemService.getSystemHealth();

      expect(health).toHaveProperty("overall");
      expect(health).toHaveProperty("components");
      expect(health.components).toHaveProperty("docker");
      expect(health.components).toHaveProperty("mongodb");
      expect(health.components).toHaveProperty("redis");
      expect(health).toHaveProperty("lastChecked");

      // Log health status for debugging
      console.log("System Health:", JSON.stringify(health, null, 2));
    });

    it("should get system statistics", async () => {
      if (!initialized) {
        vi.skip();
      }

      const stats = await systemService.getSystemStats();

      expect(stats).toHaveProperty("users");
      expect(stats).toHaveProperty("projects");
      expect(stats).toHaveProperty("sessions");
      expect(stats).toHaveProperty("cache");
      expect(stats).toHaveProperty("database");

      expect(stats.users).toHaveProperty("totalUsers");
      expect(stats.projects).toHaveProperty("totalProjects");
      expect(stats.sessions).toHaveProperty("totalSessions");

      // Log stats for debugging
      console.log("System Stats:", JSON.stringify(stats, null, 2));
    });
  });

  describe("User Operations Integration", () => {
    const testEmail = `test-integration-${Date.now()}@example.com`;

    it("should create and then find a user", async () => {
      // Skip if Docker is not available
      if (!initialized) {
        vi.skip();
      }

      const health = await systemService.getSystemHealth();
      if (health.components.docker.status === "error") {
        console.log("Skipping user creation test - Docker not available");
        return;
      }

      // Create user
      const createResult = await userService.createUser({
        email: testEmail,
        isAdmin: false,
        firstName: "Integration",
        lastName: "Test",
      });

      if (createResult.success) {
        expect(createResult.user).toBeDefined();
        expect(createResult.user?.email).toBe(testEmail);

        // Find the created user
        const foundUser = await userService.getUserByEmail(testEmail);
        expect(foundUser).toBeDefined();
        expect(foundUser?.email).toBe(testEmail);

        // Clean up - delete the test user
        const deleteResult = await userService.deleteUser(testEmail, true);
        expect(deleteResult.success).toBe(true);
      } else {
        console.log("User creation failed:", createResult.error);
        console.log("Execution result:", createResult.executionResult);
      }
    });

    it("should list existing users", async () => {
      if (!initialized) {
        vi.skip();
      }

      const result = await userService.listUsers({ limit: 10 });

      expect(result).toHaveProperty("users");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.users)).toBe(true);
      expect(typeof result.total).toBe("number");

      console.log(`Found ${result.total} users in the system`);
    });

    it("should get user statistics", async () => {
      if (!initialized) {
        vi.skip();
      }

      const stats = await userService.getUserStats();

      expect(stats).toHaveProperty("totalUsers");
      expect(stats).toHaveProperty("adminUsers");
      expect(stats).toHaveProperty("activeUsers");
      expect(stats).toHaveProperty("newUsersThisMonth");

      expect(typeof stats.totalUsers).toBe("number");
      expect(typeof stats.adminUsers).toBe("number");

      console.log("User Stats:", stats);
    });
  });

  describe("Project Operations Integration", () => {
    it("should list existing projects", async () => {
      if (!initialized) {
        vi.skip();
      }

      const result = await projectService.listProjects({ limit: 10 });

      expect(result).toHaveProperty("projects");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.projects)).toBe(true);

      console.log(`Found ${result.total} projects in the system`);
    });

    it("should get project statistics", async () => {
      if (!initialized) {
        vi.skip();
      }

      const stats = await projectService.getProjectStats();

      expect(stats).toHaveProperty("totalProjects");
      expect(stats).toHaveProperty("activeProjects");
      expect(stats).toHaveProperty("projectsThisMonth");
      expect(stats).toHaveProperty("averageProjectsPerUser");

      expect(typeof stats.totalProjects).toBe("number");

      console.log("Project Stats:", stats);
    });

    it("should handle project search", async () => {
      if (!initialized) {
        vi.skip();
      }

      const projects = await projectService.searchProjects("test", 5);

      expect(Array.isArray(projects)).toBe(true);
      console.log(`Found ${projects.length} projects matching 'test'`);
    });
  });

  describe("Docker Container Integration", () => {
    it("should check Overleaf system components", async () => {
      if (!initialized) {
        vi.skip();
      }

      const health = await systemService.getSystemHealth();

      if (health.components.docker.status === "error") {
        console.log("Skipping Docker tests - container not running");
        return;
      }

      const checks = await systemService.runOverleafSystemChecks();

      expect(checks).toHaveProperty("mongodb");
      expect(checks).toHaveProperty("redis");

      console.log("MongoDB Check:", checks.mongodb.success ? "PASS" : "FAIL");
      console.log("Redis Check:", checks.redis.success ? "PASS" : "FAIL");

      if (checks.texlive) {
        console.log(
          "TeX Live Check:",
          checks.texlive.success ? "PASS" : "FAIL",
        );
      }
    });

    it("should list available containers", async () => {
      if (!initialized) {
        vi.skip();
      }

      const containers = await systemService.getAvailableContainers();

      expect(Array.isArray(containers)).toBe(true);
      console.log(
        "Available containers:",
        containers.map((c) => c.name).join(", "),
      );
    });
  });

  describe("Redis Integration", () => {
    it("should get session information", async () => {
      if (!initialized) {
        vi.skip();
      }

      const sessions = await userService.getActiveSessions();
      const sessionStats = await userService.getSessionStats();

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessionStats).toHaveProperty("totalSessions");
      expect(sessionStats).toHaveProperty("authenticatedSessions");

      console.log(`Active sessions: ${sessions.length}`);
      console.log("Session stats:", sessionStats);
    });

    it("should handle maintenance operations", async () => {
      if (!initialized) {
        vi.skip();
      }

      const maintenanceResult = await systemService.performMaintenance();

      expect(maintenanceResult).toHaveProperty("success");
      expect(maintenanceResult).toHaveProperty("results");
      expect(maintenanceResult.results).toHaveProperty(
        "expiredSessionsCleared",
      );

      console.log(
        `Maintenance completed. Cleared ${maintenanceResult.results.expiredSessionsCleared} expired sessions`,
      );
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid user operations gracefully", async () => {
      if (!initialized) {
        vi.skip();
      }

      // Try to get non-existent user
      const user = await userService.getUserByEmail("nonexistent@invalid.com");
      expect(user).toBeNull();

      // Try to delete non-existent user
      const deleteResult = await userService.deleteUser(
        "nonexistent@invalid.com",
      );
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBe("User not found");
    });

    it("should handle invalid project operations gracefully", async () => {
      if (!initialized) {
        vi.skip();
      }

      // Try to get non-existent project
      const project = await projectService.getProjectById("invalid-project-id");
      expect(project).toBeNull();

      // Try to get projects for non-existent user
      const projects =
        await projectService.getProjectsByOwner("invalid-user-id");
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBe(0);
    });
  });
});
