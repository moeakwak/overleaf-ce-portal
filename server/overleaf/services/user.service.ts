import type { DockerCommandExecutor } from "../../connectors/docker-executor";
import type {
  OverleafUser,
  ScriptExecutionResult,
  UserCreationOptions,
  UserListOptions,
} from "../../types/overleaf";
import type { OverleafInstance } from "../instance";
import { OverleafProjectRepository } from "../repositories/project.repository";
import { OverleafSessionRepository } from "../repositories/session.repository";
import { OverleafUserRepository } from "../repositories/user.repository";

/**
 * Service for Overleaf user management.
 *
 * Responsibilities:
 * - Business logic for user operations (create, delete, upgrade features)
 * - Data transformation and assembly
 * - Orchestration of Repository calls
 * - Integration with Docker scripts for write operations
 *
 * Uses Repository pattern for data access - all database queries go through repositories.
 */
export class OverleafUserService {
  private readonly userRepo: OverleafUserRepository;
  private readonly projectRepo: OverleafProjectRepository;
  private readonly sessionRepo: OverleafSessionRepository;
  private readonly dockerExecutor: DockerCommandExecutor;

  constructor(instance: OverleafInstance) {
    this.userRepo = new OverleafUserRepository(instance);
    this.projectRepo = new OverleafProjectRepository(instance);
    this.sessionRepo = new OverleafSessionRepository(instance);
    this.dockerExecutor = instance.getDockerExecutor();
  }

  /**
   * Create a new user via Overleaf scripts
   */
  public async createUser(options: UserCreationOptions): Promise<{
    success: boolean;
    user?: OverleafUser;
    executionResult: ScriptExecutionResult;
    error?: string;
  }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepo.findByEmail(options.email);
      if (existingUser) {
        return {
          success: false,
          error: "User with this email already exists",
          executionResult: {
            success: false,
            stdout: "",
            stderr: "User already exists",
            exitCode: 1,
            executionTime: 0,
          },
        };
      }

      // Execute create-user script
      const executionResult = await this.dockerExecutor.createUser(
        options.email,
        options.isAdmin || false,
      );

      if (!executionResult.success) {
        return {
          success: false,
          error: executionResult.stderr || "Failed to create user",
          executionResult,
        };
      }

      // Wait for user to be created in database
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const user = await this.userRepo.findByEmail(options.email);

      return {
        success: true,
        user: user || undefined,
        executionResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionResult: {
          success: false,
          stdout: "",
          stderr: error instanceof Error ? error.message : "Unknown error",
          exitCode: -1,
          executionTime: 0,
        },
      };
    }
  }

  /**
   * Delete a user via Overleaf scripts
   */
  public async deleteUser(
    email: string,
    skipEmail = false,
  ): Promise<{
    success: boolean;
    executionResult: ScriptExecutionResult;
    error?: string;
  }> {
    try {
      // Check if user exists
      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          executionResult: {
            success: false,
            stdout: "",
            stderr: "User not found",
            exitCode: 1,
            executionTime: 0,
          },
        };
      }

      // Execute delete-user script
      const executionResult = await this.dockerExecutor.deleteUser(
        email,
        skipEmail,
      );

      return {
        success: executionResult.success,
        executionResult,
        error: executionResult.success ? undefined : executionResult.stderr,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionResult: {
          success: false,
          stdout: "",
          stderr: error instanceof Error ? error.message : "Unknown error",
          exitCode: -1,
          executionTime: 0,
        },
      };
    }
  }

  /**
   * Upgrade user features
   */
  public async upgradeUserFeatures(
    email: string,
    features?: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    executionResult: ScriptExecutionResult;
    error?: string;
  }> {
    try {
      // Check if user exists
      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          executionResult: {
            success: false,
            stdout: "",
            stderr: "User not found",
            exitCode: 1,
            executionTime: 0,
          },
        };
      }

      // Execute upgrade-user-features script
      const executionResult = await this.dockerExecutor.upgradeUserFeatures(
        email,
        features,
      );

      return {
        success: executionResult.success,
        executionResult,
        error: executionResult.success ? undefined : executionResult.stderr,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionResult: {
          success: false,
          stdout: "",
          stderr: error instanceof Error ? error.message : "Unknown error",
          exitCode: -1,
          executionTime: 0,
        },
      };
    }
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(email: string): Promise<OverleafUser | null> {
    try {
      return await this.userRepo.findByEmail(email);
    } catch (error) {
      console.error("Error getting user by email:", error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(id: string): Promise<OverleafUser | null> {
    try {
      return await this.userRepo.findById(id);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  /**
   * List users with pagination and filtering
   *
   * This method demonstrates the separation of concerns:
   * - Service layer builds the filter (business logic)
   * - Repository executes the query (data access)
   * - Service calculates hasMore (business logic)
   */
  public async listUsers(options: UserListOptions = {}): Promise<{
    users: OverleafUser[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit = 50, offset = 0, emailFilter, adminOnly } = options;

      // Business logic: Build filter
      const filter: Record<string, any> = {};
      if (emailFilter) {
        filter.email = { $regex: emailFilter, $options: "i" };
      }
      if (adminOnly) {
        filter.isAdmin = true;
      }

      // Data access: Query via Repository
      const sort = { signUpDate: -1 as const };
      const [users, total] = await Promise.all([
        this.userRepo.findMany(filter, { skip: offset, limit, sort }),
        this.userRepo.count(filter),
      ]);

      // Business logic: Calculate hasMore
      return {
        users,
        total,
        hasMore: offset + users.length < total,
      };
    } catch (error) {
      console.error("Error listing users:", error);
      return { users: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(): Promise<{
    totalUsers: number;
    adminUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  }> {
    try {
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
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        totalUsers: 0,
        adminUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      };
    }
  }

  /**
   * Get user sessions
   */
  public async getUserSessions(userId: string): Promise<
    {
      sessionId: string;
      data: unknown;
    }[]
  > {
    try {
      return await this.sessionRepo.getUserSessions(userId);
    } catch (error) {
      console.error("Error getting user sessions:", error);
      return [];
    }
  }

  /**
   * Get all active sessions
   */
  public async getActiveSessions(): Promise<
    {
      sessionId: string;
      data: unknown;
    }[]
  > {
    try {
      return await this.sessionRepo.getAllSessions();
    } catch (error) {
      console.error("Error getting active sessions:", error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(): Promise<{
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
   * Clear expired sessions
   */
  public async clearExpiredSessions(): Promise<number> {
    try {
      const sessions = await this.sessionRepo.getAllSessions();
      const now = new Date();

      const expiredSessionIds = sessions
        .filter((session) => new Date(session.data.cookie.expires) < now)
        .map((session) => session.sessionId);

      if (expiredSessionIds.length === 0) {
        return 0;
      }

      return await this.sessionRepo.deleteSessions(expiredSessionIds);
    } catch (error) {
      console.error("Error clearing expired sessions:", error);
      return 0;
    }
  }

  /**
   * Search users by email pattern
   */
  public async searchUsers(
    emailPattern: string,
    limit = 20,
  ): Promise<OverleafUser[]> {
    try {
      const filter = {
        email: { $regex: emailPattern, $options: "i" },
      };
      return await this.userRepo.findMany(filter, { limit });
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  }

  /**
   * Get user with projects summary
   */
  public async getUserWithProjectsSummary(userId: string): Promise<{
    user: OverleafUser | null;
    projectCount: number;
    lastProjectUpdate?: Date;
  }> {
    try {
      const [user, projects] = await Promise.all([
        this.userRepo.findById(userId),
        this.projectRepo.findByOwner(userId),
      ]);

      const lastProjectUpdate =
        projects.length > 0
          ? new Date(
              Math.max(...projects.map((p) => p.lastUpdated?.getTime() || 0)),
            )
          : undefined;

      return {
        user,
        projectCount: projects.length,
        lastProjectUpdate,
      };
    } catch (error) {
      console.error("Error getting user with projects summary:", error);
      return {
        user: null,
        projectCount: 0,
      };
    }
  }
}
