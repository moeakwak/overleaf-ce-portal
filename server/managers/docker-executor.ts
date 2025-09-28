import Docker from "dockerode";
import { env } from "@/lib/env";
import type {
  ScriptExecutionOptions,
  ScriptExecutionResult,
} from "../types/overleaf";

export class DockerCommandExecutor {
  private docker: Docker;
  private static instance: DockerCommandExecutor;

  private constructor() {
    this.docker = new Docker({
      socketPath: env.DOCKER_SOCKET_PATH,
    });
  }

  public static getInstance(): DockerCommandExecutor {
    if (!DockerCommandExecutor.instance) {
      DockerCommandExecutor.instance = new DockerCommandExecutor();
    }
    return DockerCommandExecutor.instance;
  }

  /**
   * Execute a script inside the Sharelatex container
   */
  public async executeScript(
    scriptPath: string,
    args: string[] = [],
    options: ScriptExecutionOptions = {},
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();

    try {
      const container = this.docker.getContainer(env.SHARELATEX_CONTAINER);

      // Check if container is running
      const containerInfo = await container.inspect();
      if (!containerInfo.State.Running) {
        throw new Error(`Container ${env.SHARELATEX_CONTAINER} is not running`);
      }

      // Prepare the command
      const cmd = [
        "node",
        `/overleaf/services/web/modules/server-ce-scripts/scripts/${scriptPath}`,
        ...args,
      ];

      // Create exec instance
      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: options.workingDir || "/overleaf/services/web",
        Env: options.env
          ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
          : undefined,
      });

      // Start execution with timeout
      const stream = await exec.start({ Demux: true });

      return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const timeout = options.timeout || 30000; // 30s default timeout
        const timer = setTimeout(() => {
          stream.destroy();
          reject(new Error(`Command execution timed out after ${timeout}ms`));
        }, timeout);

        stream.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        stream.on("error", (err: Error) => {
          stderr += err.message;
        });

        stream.on("end", async () => {
          clearTimeout(timer);

          try {
            const inspectResult = await exec.inspect();
            const executionTime = Date.now() - startTime;

            resolve({
              success: inspectResult.ExitCode === 0,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: inspectResult.ExitCode || 0,
              executionTime,
            });
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : "Unknown error",
        exitCode: -1,
        executionTime,
      };
    }
  }

  /**
   * Execute create-user script
   */
  public async createUser(
    email: string,
    isAdmin = false,
  ): Promise<ScriptExecutionResult> {
    const args = ["--email", email];
    if (isAdmin) {
      args.push("--admin");
    }

    return this.executeScript("create-user.mjs", args, {
      timeout: 60000, // 1 minute timeout for user creation
    });
  }

  /**
   * Execute delete-user script
   */
  public async deleteUser(
    email: string,
    skipEmail = false,
  ): Promise<ScriptExecutionResult> {
    const args = ["--email", email];
    if (skipEmail) {
      args.push("--skip-email");
    }

    return this.executeScript("delete-user.mjs", args, {
      timeout: 60000,
    });
  }

  /**
   * Execute export-user-projects script
   */
  public async exportUserProjects(options: {
    userId?: string;
    projectId?: string;
    outputPath?: string;
    exportAll?: boolean;
    outputDir?: string;
    list?: boolean;
  }): Promise<ScriptExecutionResult> {
    const args: string[] = [];

    if (options.userId) {
      args.push("--user-id", options.userId);
    }

    if (options.projectId) {
      args.push("--project-id", options.projectId);
    }

    if (options.outputPath) {
      args.push("--output", options.outputPath);
    }

    if (options.exportAll) {
      args.push("--export-all");
    }

    if (options.outputDir) {
      args.push("--output-dir", options.outputDir);
    }

    if (options.list) {
      args.push("--list");
    }

    return this.executeScript("export-user-projects.mjs", args, {
      timeout: 300000, // 5 minutes timeout for export operations
    });
  }

  /**
   * Execute upgrade-user-features script
   */
  public async upgradeUserFeatures(
    email: string,
    features?: Record<string, any>,
  ): Promise<ScriptExecutionResult> {
    const args = ["--email", email];

    if (features) {
      // Add feature flags if provided
      for (const [key, value] of Object.entries(features)) {
        args.push(`--${key}`, String(value));
      }
    }

    return this.executeScript("upgrade-user-features.mjs", args, {
      timeout: 60000,
    });
  }

  /**
   * Check MongoDB connection
   */
  public async checkMongoDB(): Promise<ScriptExecutionResult> {
    return this.executeScript("check-mongodb.mjs", [], {
      timeout: 30000,
    });
  }

  /**
   * Check Redis connection
   */
  public async checkRedis(): Promise<ScriptExecutionResult> {
    return this.executeScript("check-redis.mjs", [], {
      timeout: 30000,
    });
  }

  /**
   * Get container status
   */
  public async getContainerStatus(): Promise<{
    isRunning: boolean;
    state: string;
    startedAt?: string;
    error?: string;
  }> {
    try {
      const container = this.docker.getContainer(env.SHARELATEX_CONTAINER);
      const containerInfo = await container.inspect();

      return {
        isRunning: containerInfo.State.Running,
        state: containerInfo.State.Status,
        startedAt: containerInfo.State.StartedAt,
      };
    } catch (error) {
      return {
        isRunning: false,
        state: "not_found",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List available containers
   */
  public async listContainers(): Promise<
    { name: string; status: string; image: string }[]
  > {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map((container) => ({
        name: container.Names[0]?.replace(/^\//, "") || "unknown",
        status: container.Status,
        image: container.Image,
      }));
    } catch (error) {
      console.error("Failed to list containers:", error);
      return [];
    }
  }
}
