import { DockerCommandExecutor } from "../managers/docker-executor";
import { MongoDBManager } from "../managers/mongodb";
import { RedisManager } from "../managers/redis";
import type { ScriptExecutionResult } from "../types/overleaf";

export interface SystemHealthStatus {
  overall: "healthy" | "warning" | "error";
  components: {
    docker: {
      status: "healthy" | "error";
      containerRunning: boolean;
      containerState: string;
      error?: string;
    };
    mongodb: {
      status: "healthy" | "error";
      connected: boolean;
      collections: string[];
      stats?: any;
      error?: string;
    };
    redis: {
      status: "healthy" | "error";
      connected: boolean;
      latency: number;
      stats?: any;
      error?: string;
    };
  };
  lastChecked: Date;
}

export class SystemService {
  private dockerExecutor: DockerCommandExecutor;
  private mongoManager: MongoDBManager;
  private redisManager: RedisManager;

  constructor() {
    this.dockerExecutor = DockerCommandExecutor.getInstance();
    this.mongoManager = MongoDBManager.getInstance();
    this.redisManager = RedisManager.getInstance();
  }

  /**
   * Perform comprehensive system health check
   */
  public async getSystemHealth(): Promise<SystemHealthStatus> {
    const lastChecked = new Date();

    try {
      // Check all components in parallel
      const [dockerStatus, mongoHealth, redisHealth] = await Promise.all([
        this.checkDockerHealth(),
        this.checkMongoDBHealth(),
        this.checkRedisHealth(),
      ]);

      // Determine overall status
      const hasErrors = [dockerStatus, mongoHealth, redisHealth].some(
        (component) => component.status === "error",
      );

      const overall: SystemHealthStatus["overall"] = hasErrors
        ? "error"
        : "healthy";

      return {
        overall,
        components: {
          docker: dockerStatus,
          mongodb: mongoHealth,
          redis: redisHealth,
        },
        lastChecked,
      };
    } catch (error) {
      return {
        overall: "error",
        components: {
          docker: {
            status: "error",
            containerRunning: false,
            containerState: "unknown",
            error: "Health check failed",
          },
          mongodb: {
            status: "error",
            connected: false,
            collections: [],
            error: "Health check failed",
          },
          redis: {
            status: "error",
            connected: false,
            latency: -1,
            error: "Health check failed",
          },
        },
        lastChecked,
      };
    }
  }

  /**
   * Check Docker and container health
   */
  private async checkDockerHealth(): Promise<
    SystemHealthStatus["components"]["docker"]
  > {
    try {
      const containerStatus = await this.dockerExecutor.getContainerStatus();

      return {
        status: containerStatus.isRunning ? "healthy" : "error",
        containerRunning: containerStatus.isRunning,
        containerState: containerStatus.state,
        error: containerStatus.error,
      };
    } catch (error) {
      return {
        status: "error",
        containerRunning: false,
        containerState: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check MongoDB health
   */
  private async checkMongoDBHealth(): Promise<
    SystemHealthStatus["components"]["mongodb"]
  > {
    try {
      const [health, stats] = await Promise.all([
        this.mongoManager.healthCheck(),
        this.mongoManager.getDatabaseStats().catch(() => null),
      ]);

      return {
        status: health.connected ? "healthy" : "error",
        connected: health.connected,
        collections: health.collections,
        stats,
        error: health.error,
      };
    } catch (error) {
      return {
        status: "error",
        connected: false,
        collections: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<
    SystemHealthStatus["components"]["redis"]
  > {
    try {
      const [health, stats] = await Promise.all([
        this.redisManager.healthCheck(),
        this.redisManager.getCacheStats().catch(() => null),
      ]);

      return {
        status: health.connected ? "healthy" : "error",
        connected: health.connected,
        latency: health.latency,
        stats,
        error: health.error,
      };
    } catch (error) {
      return {
        status: "error",
        connected: false,
        latency: -1,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Run Overleaf system checks
   */
  public async runOverleafSystemChecks(): Promise<{
    mongodb: ScriptExecutionResult;
    redis: ScriptExecutionResult;
    texlive?: ScriptExecutionResult;
  }> {
    try {
      const [mongoCheck, redisCheck] = await Promise.all([
        this.dockerExecutor.checkMongoDB(),
        this.dockerExecutor.checkRedis(),
      ]);

      // Optional: Check TeX Live if available
      let texliveCheck: ScriptExecutionResult | undefined;
      try {
        texliveCheck = await this.dockerExecutor.executeScript(
          "check-texlive-images.mjs",
          [],
          {
            timeout: 60000,
          },
        );
      } catch (error) {
        // TeX Live check might not be available, ignore errors
      }

      return {
        mongodb: mongoCheck,
        redis: redisCheck,
        texlive: texliveCheck,
      };
    } catch (error) {
      const errorResult: ScriptExecutionResult = {
        success: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : "Unknown error",
        exitCode: -1,
        executionTime: 0,
      };

      return {
        mongodb: errorResult,
        redis: errorResult,
      };
    }
  }

  /**
   * Get system statistics
   */
  public async getSystemStats(): Promise<{
    users: {
      totalUsers: number;
      adminUsers: number;
      activeUsers: number;
      newUsersThisMonth: number;
    };
    projects: {
      totalProjects: number;
      activeProjects: number;
      projectsThisMonth: number;
      averageProjectsPerUser: number;
    };
    sessions: {
      totalSessions: number;
      authenticatedSessions: number;
      expiredSessions: number;
    };
    cache: {
      totalKeys: number;
      sessionKeys: number;
      documentKeys: number;
      memoryUsage: number;
      connectedClients: number;
    };
    database: {
      dbSize: number;
      collections: { name: string; count: number }[];
      indexes: number;
    };
  }> {
    try {
      const [userStats, projectStats, sessionStats, cacheStats, dbStats] =
        await Promise.all([
          this.mongoManager.getUserStats(),
          this.mongoManager.getProjectStats(),
          this.redisManager.getSessionStats(),
          this.redisManager.getCacheStats(),
          this.mongoManager.getDatabaseStats(),
        ]);

      return {
        users: userStats,
        projects: projectStats,
        sessions: sessionStats,
        cache: cacheStats,
        database: dbStats,
      };
    } catch (error) {
      console.error("Error getting system stats:", error);
      // Return empty stats on error
      return {
        users: {
          totalUsers: 0,
          adminUsers: 0,
          activeUsers: 0,
          newUsersThisMonth: 0,
        },
        projects: {
          totalProjects: 0,
          activeProjects: 0,
          projectsThisMonth: 0,
          averageProjectsPerUser: 0,
        },
        sessions: {
          totalSessions: 0,
          authenticatedSessions: 0,
          expiredSessions: 0,
        },
        cache: {
          totalKeys: 0,
          sessionKeys: 0,
          documentKeys: 0,
          memoryUsage: 0,
          connectedClients: 0,
        },
        database: { dbSize: 0, collections: [], indexes: 0 },
      };
    }
  }

  /**
   * Initialize system connections
   */
  public async initializeSystem(): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Initialize MongoDB connection
      try {
        await this.mongoManager.connect();
      } catch (error) {
        errors.push(
          `Failed to connect to MongoDB: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Initialize Redis connection
      try {
        await this.redisManager.connect();
      } catch (error) {
        errors.push(
          `Failed to connect to Redis: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Check Docker container status
      try {
        const containerStatus = await this.dockerExecutor.getContainerStatus();
        if (!containerStatus.isRunning) {
          warnings.push(
            `Sharelatex container is not running: ${containerStatus.state}`,
          );
        }
      } catch (error) {
        warnings.push(
          `Failed to check container status: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        warnings,
      };
    }
  }

  /**
   * Cleanup system resources
   */
  public async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.mongoManager.disconnect(),
        this.redisManager.disconnect(),
      ]);
    } catch (error) {
      console.error("Error during system cleanup:", error);
    }
  }

  /**
   * Get available containers
   */
  public async getAvailableContainers(): Promise<
    { name: string; status: string; image: string }[]
  > {
    try {
      return await this.dockerExecutor.listContainers();
    } catch (error) {
      console.error("Error getting available containers:", error);
      return [];
    }
  }

  /**
   * Perform maintenance tasks
   */
  public async performMaintenance(): Promise<{
    success: boolean;
    results: {
      expiredSessionsCleared: number;
      errors: string[];
    };
  }> {
    const results = {
      expiredSessionsCleared: 0,
      errors: [] as string[],
    };

    try {
      // Clear expired sessions
      try {
        results.expiredSessionsCleared =
          await this.redisManager.clearExpiredSessions();
      } catch (error) {
        results.errors.push(
          `Failed to clear expired sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Additional maintenance tasks can be added here

      return {
        success: results.errors.length === 0,
        results,
      };
    } catch (error) {
      results.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      return {
        success: false,
        results,
      };
    }
  }
}
