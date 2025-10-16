import type Docker from "dockerode";
import type {
  ScriptExecutionOptions,
  ScriptExecutionResult,
} from "../types/overleaf";

/**
 * Executes scripts inside the Sharelatex/Overleaf Docker container.
 *
 * This class wraps Docker exec operations to run Overleaf CE toolkit scripts.
 * It's designed to be instantiated per OverleafInstance (not a singleton)
 * to support future multi-workspace scenarios.
 *
 * Key responsibilities:
 * - Execute scripts in the configured container
 * - Handle command timeouts and errors
 * - Parse script outputs
 * - Provide convenient methods for common Overleaf operations
 *
 * Usage:
 * ```typescript
 * const executor = new DockerCommandExecutor(docker, containerName);
 * const result = await executor.createUser("user@example.com", true);
 * ```
 */
export class DockerCommandExecutor {
  constructor(
    private readonly docker: Docker,
    private readonly containerName: string,
  ) {}

  /**
   * Execute a script inside the Sharelatex container
   *
   * This follows the official Overleaf CE toolkit pattern:
   * `/bin/bash -ce "cd /overleaf/services/web && node modules/server-ce-scripts/scripts/{script} {args}"`
   */
  public async executeScript(
    scriptPath: string,
    args: string[] = [],
    options: ScriptExecutionOptions = {},
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();

    try {
      const container = this.docker.getContainer(this.containerName);

      // Check if container is running
      const containerInfo = await container.inspect();
      if (!containerInfo.State.Running) {
        throw new Error(`Container ${this.containerName} is not running`);
      }

      // Build the inner command that will be executed by bash
      // First part: cd command
      // Second part: node command with script and its arguments joined by spaces
      const nodeCommand = [
        `node modules/server-ce-scripts/scripts/${scriptPath}`,
        ...args,
      ].join(" ");

      const innerCommand = `cd /overleaf/services/web && ${nodeCommand}`;

      // Prepare the command following official pattern: /bin/bash -ce "command"
      const cmd = ["/bin/bash", "-ce", innerCommand];

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
      const stream = (await exec.start({})) as any;

      return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const timeout = options.timeout || 30000; // 30s default timeout
        const timer = setTimeout(() => {
          stream?.destroy?.();
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
   *
   * Official command format:
   * `node modules/server-ce-scripts/scripts/create-user.mjs --admin --email=joe@example.com`
   */
  public async createUser(
    email: string,
    isAdmin = false,
  ): Promise<ScriptExecutionResult> {
    const args: string[] = [];

    if (isAdmin) {
      args.push("--admin");
    }

    // Use --email=value format as shown in official docs
    args.push(`--email=${email}`);

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
    const args: string[] = [];

    // Use --email=value format for consistency
    args.push(`--email=${email}`);

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

    return this.executeScript("export-user-projects", args, {
      timeout: 300000, // 5 minutes timeout for export operations
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
      const container = this.docker.getContainer(this.containerName);
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
