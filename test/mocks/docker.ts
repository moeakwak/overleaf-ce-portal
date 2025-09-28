import { vi } from "vitest";
import type { ScriptExecutionResult } from "@/server/types/overleaf";

export const mockDockerExecutor = {
  getInstance: vi.fn(),
  executeScript: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  exportUserProjects: vi.fn(),
  upgradeUserFeatures: vi.fn(),
  checkMongoDB: vi.fn(),
  checkRedis: vi.fn(),
  getContainerStatus: vi.fn(),
  listContainers: vi.fn(),
};

export const mockSuccessResult: ScriptExecutionResult = {
  success: true,
  stdout: "Operation completed successfully",
  stderr: "",
  exitCode: 0,
  executionTime: 1000,
};

export const mockErrorResult: ScriptExecutionResult = {
  success: false,
  stdout: "",
  stderr: "Operation failed",
  exitCode: 1,
  executionTime: 500,
};
