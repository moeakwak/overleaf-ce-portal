import { DockerCommandExecutor } from "../managers/docker-executor";
import { MongoDBManager } from "../managers/mongodb";
import { RedisManager } from "../managers/redis";
import type {
  OverleafUser,
  ScriptExecutionResult,
  UserCreationOptions,
  UserListOptions,
} from "../types/overleaf";

export class UserService {
  private dockerExecutor: DockerCommandExecutor;
  private mongoManager: MongoDBManager;
  private redisManager: RedisManager;

  constructor() {
    this.dockerExecutor = DockerCommandExecutor.getInstance();
    this.mongoManager = MongoDBManager.getInstance();
    this.redisManager = RedisManager.getInstance();
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
      // First check if user already exists
      const existingUser = await this.mongoManager.findUserByEmail(
        options.email,
      );
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

      // Fetch the created user
      // Wait a bit for the user to be created in the database
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const user = await this.mongoManager.findUserByEmail(options.email);

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
      const user = await this.mongoManager.findUserByEmail(email);
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
    features?: Record<string, any>,
  ): Promise<{
    success: boolean;
    executionResult: ScriptExecutionResult;
    error?: string;
  }> {
    try {
      // Check if user exists
      const user = await this.mongoManager.findUserByEmail(email);
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
      return await this.mongoManager.findUserByEmail(email);
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
      return await this.mongoManager.findUserById(id);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  /**
   * List users with pagination and filtering
   */
  public async listUsers(options: UserListOptions = {}): Promise<{
    users: OverleafUser[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      return await this.mongoManager.listUsers(options);
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
      return await this.mongoManager.getUserStats();
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
      data: any;
    }[]
  > {
    try {
      return await this.redisManager.getUserSessions(userId);
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
      data: any;
    }[]
  > {
    try {
      return await this.redisManager.getActiveSessions();
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
      return await this.redisManager.getSessionStats();
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
      return await this.redisManager.clearExpiredSessions();
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
      const result = await this.mongoManager.listUsers({
        emailFilter: emailPattern,
        limit,
      });
      return result.users;
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
        this.mongoManager.findUserById(userId),
        this.mongoManager.findProjectsByOwner(userId),
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
