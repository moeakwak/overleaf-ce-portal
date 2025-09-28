import { describe, it, expect, vi, beforeEach } from "vitest";
import { DockerCommandExecutor } from "@/server/managers/docker-executor";

// Mock dockerode
vi.mock("dockerode", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getContainer: vi.fn().mockReturnValue({
        inspect: vi.fn(),
        exec: vi.fn(),
      }),
      listContainers: vi.fn(),
    })),
  };
});

describe("DockerCommandExecutor", () => {
  let executor: DockerCommandExecutor;
  let mockContainer: any;
  let mockExec: any;

  beforeEach(() => {
    executor = DockerCommandExecutor.getInstance();

    // Setup mocks
    mockExec = {
      start: vi.fn(),
      inspect: vi.fn().mockResolvedValue({ ExitCode: 0 }),
    };

    mockContainer = {
      inspect: vi.fn().mockResolvedValue({
        State: {
          Running: true,
          Status: "running",
          StartedAt: "2023-01-01T00:00:00Z",
        },
      }),
      exec: vi.fn().mockResolvedValue(mockExec),
    };

    // Mock Docker instance
    const dockerInstance = (executor as any).docker;
    if (dockerInstance) {
      dockerInstance.getContainer = vi.fn().mockReturnValue(mockContainer);
      dockerInstance.listContainers = vi.fn().mockResolvedValue([
        {
          Names: ["/sharelatex"],
          Status: "Up 1 hour",
          Image: "sharelatex/sharelatex:latest",
        },
      ]);
    }
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = DockerCommandExecutor.getInstance();
      const instance2 = DockerCommandExecutor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("executeScript", () => {
    it("should execute script successfully", async () => {
      // Mock stream events
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === "end") {
            // Simulate stream end
            setTimeout(() => callback(), 10);
          }
          return mockStream;
        }),
        destroy: vi.fn(),
      };

      mockExec.start.mockResolvedValue(mockStream);

      const result = await executor.executeScript("test-script.mjs", [
        "--arg1",
        "value1",
      ]);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: [
          "node",
          "/overleaf/services/web/modules/server-ce-scripts/scripts/test-script.mjs",
          "--arg1",
          "value1",
        ],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: "/overleaf/services/web",
        Env: undefined,
      });
    });

    it("should handle container not running", async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: false, Status: "stopped" },
      });

      const result = await executor.executeScript("test-script.mjs");

      expect(result.success).toBe(false);
      expect(result.stderr).toContain("Container sharelatex is not running");
    });

    it("should handle execution timeout", async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          // Don't call any callbacks to simulate hanging stream
          return mockStream;
        }),
        destroy: vi.fn(),
      };

      mockExec.start.mockResolvedValue(mockStream);

      // Create a promise that we expect to be rejected
      await expect(
        executor.executeScript("test-script.mjs", [], { timeout: 50 }),
      ).rejects.toThrow("Command execution timed out after 50ms");

      expect(mockStream.destroy).toHaveBeenCalled();
    }, 200);
  });

  describe("createUser", () => {
    it("should create user successfully", async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return mockStream;
        }),
        destroy: vi.fn(),
      };

      mockExec.start.mockResolvedValue(mockStream);

      const result = await executor.createUser("test@example.com", true);

      expect(result.success).toBe(true);
      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: [
          "node",
          "/overleaf/services/web/modules/server-ce-scripts/scripts/create-user.mjs",
          "--email",
          "test@example.com",
          "--admin",
        ],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: "/overleaf/services/web",
        Env: undefined,
      });
    });

    it("should create regular user without admin flag", async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return mockStream;
        }),
        destroy: vi.fn(),
      };

      mockExec.start.mockResolvedValue(mockStream);

      await executor.createUser("test@example.com", false);

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: [
          "node",
          "/overleaf/services/web/modules/server-ce-scripts/scripts/create-user.mjs",
          "--email",
          "test@example.com",
        ],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: "/overleaf/services/web",
        Env: undefined,
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete user with skip email option", async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return mockStream;
        }),
        destroy: vi.fn(),
      };

      mockExec.start.mockResolvedValue(mockStream);

      await executor.deleteUser("test@example.com", true);

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: [
          "node",
          "/overleaf/services/web/modules/server-ce-scripts/scripts/delete-user.mjs",
          "--email",
          "test@example.com",
          "--skip-email",
        ],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: "/overleaf/services/web",
        Env: undefined,
      });
    });
  });

  describe("exportUserProjects", () => {
    it("should export projects with correct arguments", async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return mockStream;
        }),
        destroy: vi.fn(),
      };

      mockExec.start.mockResolvedValue(mockStream);

      await executor.exportUserProjects({
        userId: "user123",
        outputPath: "/tmp/export.zip",
      });

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: [
          "node",
          "/overleaf/services/web/modules/server-ce-scripts/scripts/export-user-projects.mjs",
          "--user-id",
          "user123",
          "--output",
          "/tmp/export.zip",
        ],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: "/overleaf/services/web",
        Env: undefined,
      });
    });
  });

  describe("getContainerStatus", () => {
    it("should return running status", async () => {
      const status = await executor.getContainerStatus();

      expect(status.isRunning).toBe(true);
      expect(status.state).toBe("running");
      expect(status.startedAt).toBe("2023-01-01T00:00:00Z");
    });

    it("should handle container not found", async () => {
      mockContainer.inspect.mockRejectedValue(new Error("Container not found"));

      const dockerInstance = (executor as any).docker;
      dockerInstance.getContainer = vi.fn().mockReturnValue(mockContainer);

      const status = await executor.getContainerStatus();

      expect(status.isRunning).toBe(false);
      expect(status.state).toBe("not_found");
      expect(status.error).toBe("Container not found");
    });
  });

  describe("listContainers", () => {
    it("should list available containers", async () => {
      const containers = await executor.listContainers();

      expect(containers).toEqual([
        {
          name: "sharelatex",
          status: "Up 1 hour",
          image: "sharelatex/sharelatex:latest",
        },
      ]);
    });

    it("should handle Docker API errors", async () => {
      const dockerInstance = (executor as any).docker;
      dockerInstance.listContainers = vi
        .fn()
        .mockRejectedValue(new Error("Docker API error"));

      const containers = await executor.listContainers();

      expect(containers).toEqual([]);
    });
  });
});
