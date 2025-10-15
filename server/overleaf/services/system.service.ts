import type { DockerCommandExecutor } from "../../connectors/docker-executor";
import type { ScriptExecutionResult } from "../../types/overleaf";
import type { OverleafInstance } from "../instance";
import { OverleafProjectRepository } from "../repositories/project.repository";
import { OverleafSessionRepository } from "../repositories/session.repository";
import { OverleafUserRepository } from "../repositories/user.repository";

/**
 * System health status
 */
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

/**
 * Service for Overleaf system monitoring and management.
 *
 * Responsibilities:
 * - System health checks across all components
 * - System-wide statistics collection
 * - Maintenance operations
 * - Connection lifecycle management
 *
 * Uses Repository pattern for data access and coordinates across all system components.
 */
export class OverleafSystemService {
  private readonly userRepo: OverleafUserRepository;
  private readonly projectRepo: OverleafProjectRepository;
  private readonly sessionRepo: OverleafSessionRepository;
  private readonly dockerExecutor: DockerCommandExecutor;
  private readonly instance: OverleafInstance;

  constructor(instance: OverleafInstance) {
    this.instance = instance;
    this.userRepo = new OverleafUserRepository(instance);
    this.projectRepo = new OverleafProjectRepository(instance);
    this.sessionRepo = new OverleafSessionRepository(instance);
    this.dockerExecutor = instance.getDockerExecutor();
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
    } catch (_error) {
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
      const db = this.instance.getMongoDB();

      // Ping database
      await db.command({ ping: 1 });

      // Get collections list
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name);

      // Get database stats
      const stats = await this.getDatabaseStats().catch(() => null);

      return {
        status: "healthy",
        connected: true,
        collections: collectionNames,
        stats,
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
      const latency = await this.sessionRepo.ping();
      const stats = await this.sessionRepo.getCacheStats().catch(() => null);

      return {
        status: "healthy",
        connected: true,
        latency,
        stats,
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
      } catch (_error) {
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
          this.getUserStats(),
          this.getProjectStats(),
          this.getSessionStats(),
          this.sessionRepo.getCacheStats(),
          this.getDatabaseStats(),
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
   * Get user statistics
   */
  private async getUserStats(): Promise<{
    totalUsers: number;
    adminUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, adminUsers, activeUsers, newUsersThisMonth] =
      await Promise.all([
        this.userRepo.count(),
        this.userRepo.countAdmins(),
        this.userRepo.countActiveUsers(thirtyDaysAgo),
        this.userRepo.countUsersSignedUpAfter(monthStart),
      ]);

    return {
      totalUsers,
      adminUsers,
      activeUsers,
      newUsersThisMonth,
    };
  }

  /**
   * Get project statistics
   */
  private async getProjectStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    projectsThisMonth: number;
    averageProjectsPerUser: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalProjects, activeProjects, projectsThisMonth, totalUsers] =
      await Promise.all([
        this.projectRepo.count(),
        this.projectRepo.countProjectsUpdatedAfter(thirtyDaysAgo),
        this.projectRepo.countProjectsUpdatedAfter(monthStart),
        this.userRepo.count(),
      ]);

    return {
      totalProjects,
      activeProjects,
      projectsThisMonth,
      averageProjectsPerUser:
        totalUsers > 0
          ? Math.round((totalProjects / totalUsers) * 100) / 100
          : 0,
    };
  }

  /**
   * Get session statistics
   */
  private async getSessionStats(): Promise<{
    totalSessions: number;
    authenticatedSessions: number;
    expiredSessions: number;
  }> {
    try {
      const sessions = await this.sessionRepo.getAllSessions();
      const now = new Date();

      const stats = sessions.reduce(
        (acc, session) => {
          acc.totalSessions++;

          if (session.data.userId) {
            acc.authenticatedSessions++;
          }

          if (new Date(session.data.cookie.expires) < now) {
            acc.expiredSessions++;
          }

          return acc;
        },
        { totalSessions: 0, authenticatedSessions: 0, expiredSessions: 0 },
      );

      return stats;
    } catch (error) {
      console.error("Error getting session stats:", error);
      return {
        totalSessions: 0,
        authenticatedSessions: 0,
        expiredSessions: 0,
      };
    }
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStats(): Promise<{
    dbSize: number;
    collections: { name: string; count: number }[];
    indexes: number;
  }> {
    try {
      const db = this.instance.getMongoDB();

      // Get database stats
      const dbStats = await db.stats();

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = await Promise.all(
        collections.map(async (col) => {
          const count = await db.collection(col.name).countDocuments();
          return { name: col.name, count };
        }),
      );

      // Calculate total indexes
      const totalIndexes = await Promise.all(
        collections.map((col) => db.collection(col.name).indexes()),
      ).then((indexes) => indexes.reduce((sum, arr) => sum + arr.length, 0));

      return {
        dbSize: dbStats.dataSize,
        collections: collectionStats,
        indexes: totalIndexes,
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return {
        dbSize: 0,
        collections: [],
        indexes: 0,
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
        const db = this.instance.getMongoDB();
        await db.command({ ping: 1 });
      } catch (error) {
        errors.push(
          `Failed to connect to MongoDB: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Initialize Redis connection
      try {
        await this.sessionRepo.ping();
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
      await this.instance.disconnect();
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
        const sessions = await this.sessionRepo.getAllSessions();
        const now = new Date();

        const expiredSessionIds = sessions
          .filter((session) => new Date(session.data.cookie.expires) < now)
          .map((session) => session.sessionId);

        if (expiredSessionIds.length > 0) {
          results.expiredSessionsCleared =
            await this.sessionRepo.deleteSessions(expiredSessionIds);
        }
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
