import type { DockerCommandExecutor } from "../../connectors/docker-executor";
import type {
  OverleafDoc,
  OverleafProject,
  ProjectExportOptions,
  ProjectListOptions,
  ScriptExecutionResult,
} from "../../types/overleaf";
import type { OverleafInstance } from "../instance";
import { OverleafProjectRepository } from "../repositories/project.repository";
import { OverleafSessionRepository } from "../repositories/session.repository";
import { OverleafUserRepository } from "../repositories/user.repository";

/**
 * Service for Overleaf project management.
 *
 * Responsibilities:
 * - Business logic for project operations (export, list, search, statistics)
 * - Data transformation and assembly
 * - Orchestration of Repository calls
 * - Integration with Docker scripts for export operations
 * - Avoiding N+1 query problems through batch operations
 *
 * Uses Repository pattern for data access - all database queries go through repositories.
 */
export class OverleafProjectService {
  private readonly projectRepo: OverleafProjectRepository;
  private readonly userRepo: OverleafUserRepository;
  private readonly sessionRepo: OverleafSessionRepository;
  private readonly dockerExecutor: DockerCommandExecutor;

  constructor(instance: OverleafInstance) {
    this.projectRepo = new OverleafProjectRepository(instance);
    this.userRepo = new OverleafUserRepository(instance);
    this.sessionRepo = new OverleafSessionRepository(instance);
    this.dockerExecutor = instance.getDockerExecutor();
  }

  /**
   * Export user projects via Docker script
   */
  public async exportUserProjects(options: ProjectExportOptions): Promise<{
    success: boolean;
    executionResult: ScriptExecutionResult;
    exportPath?: string;
    error?: string;
  }> {
    try {
      // Validate user exists if userId is provided
      if (options.userId) {
        const user = await this.userRepo.findById(options.userId);
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
      }

      // Validate project exists if projectId is provided
      if (options.projectId) {
        const project = await this.projectRepo.findById(options.projectId);
        if (!project) {
          return {
            success: false,
            error: "Project not found",
            executionResult: {
              success: false,
              stdout: "",
              stderr: "Project not found",
              exitCode: 1,
              executionTime: 0,
            },
          };
        }
      }

      // Execute export script
      const executionResult = await this.dockerExecutor.exportUserProjects({
        userId: options.userId,
        projectId: options.projectId,
        outputPath: options.outputPath,
        exportAll: options.exportAll,
        outputDir: options.exportAll ? options.outputPath : undefined,
      });

      return {
        success: executionResult.success,
        executionResult,
        exportPath: options.outputPath,
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
   * List user projects via Docker script
   */
  public async listUserProjectsViaScript(userId: string): Promise<{
    success: boolean;
    projects: string[];
    executionResult: ScriptExecutionResult;
    error?: string;
  }> {
    try {
      // Validate user exists
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return {
          success: false,
          projects: [],
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

      // Execute list projects script
      const executionResult = await this.dockerExecutor.exportUserProjects({
        userId,
        list: true,
      });

      if (!executionResult.success) {
        return {
          success: false,
          projects: [],
          error: executionResult.stderr,
          executionResult,
        };
      }

      // Parse the output to extract project list
      const projects = executionResult.stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.trim());

      return {
        success: true,
        projects,
        executionResult,
      };
    } catch (error) {
      return {
        success: false,
        projects: [],
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
   * Get project by ID
   */
  public async getProjectById(id: string): Promise<OverleafProject | null> {
    try {
      return await this.projectRepo.findById(id);
    } catch (error) {
      console.error("Error getting project by ID:", error);
      return null;
    }
  }

  /**
   * Get projects by owner
   */
  public async getProjectsByOwner(ownerId: string): Promise<OverleafProject[]> {
    try {
      return await this.projectRepo.findByOwner(ownerId);
    } catch (error) {
      console.error("Error getting projects by owner:", error);
      return [];
    }
  }

  /**
   * List projects with pagination and filtering
   *
   * This method avoids N+1 query problems by:
   * 1. Fetching all projects in one query
   * 2. Collecting all unique user IDs
   * 3. Batch fetching all users at once
   * 4. Assembling the data in-memory
   */
  public async listProjects(options: ProjectListOptions = {}): Promise<{
    projects: (OverleafProject & { ownerInfo?: any })[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        limit = 50,
        offset = 0,
        ownerId,
        nameFilter,
        sortBy = "lastUpdated",
        sortOrder = "desc",
      } = options;

      // Business logic: Build filter
      const filter: Record<string, any> = {};
      if (ownerId) {
        filter.owner_ref = ownerId;
      }
      if (nameFilter) {
        filter.name = { $regex: nameFilter, $options: "i" };
      }

      // Business logic: Build sort
      const sort: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      // Data access: Query via Repository
      const [projects, total] = await Promise.all([
        this.projectRepo.findMany(filter, { skip: offset, limit, sort }),
        this.projectRepo.count(filter),
      ]);

      // Batch fetch owner information to avoid N+1 queries
      const ownerIds = [...new Set(projects.map((p) => p.owner_ref))];
      const users = await this.userRepo.findByIds(ownerIds);
      const userMap = new Map(users.map((u) => [u._id, u]));

      // Assemble data with owner information
      const projectsWithOwner = projects.map((project) => ({
        ...project,
        ownerInfo: userMap.get(project.owner_ref),
      }));

      // Business logic: Calculate hasMore
      return {
        projects: projectsWithOwner,
        total,
        hasMore: offset + projects.length < total,
      };
    } catch (error) {
      console.error("Error listing projects:", error);
      return { projects: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get project statistics
   */
  public async getProjectStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    projectsThisMonth: number;
    averageProjectsPerUser: number;
  }> {
    try {
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
    } catch (error) {
      console.error("Error getting project stats:", error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        projectsThisMonth: 0,
        averageProjectsPerUser: 0,
      };
    }
  }

  /**
   * Get project documents
   */
  public async getProjectDocuments(projectId: string): Promise<OverleafDoc[]> {
    try {
      return await this.projectRepo.findDocsByProject(projectId);
    } catch (error) {
      console.error("Error getting project documents:", error);
      return [];
    }
  }

  /**
   * Get document by ID
   */
  public async getDocumentById(id: string): Promise<OverleafDoc | null> {
    try {
      return await this.projectRepo.findDocById(id);
    } catch (error) {
      console.error("Error getting document by ID:", error);
      return null;
    }
  }

  /**
   * Get project with real-time info from Redis
   */
  public async getProjectWithRealtimeInfo(projectId: string): Promise<{
    project: OverleafProject | null;
    realtimeInfo: {
      documentHead: any;
      version: number | null;
      changesCount: number;
      recentChanges: any[];
      persistedVersionInfo: any;
    };
  }> {
    try {
      const [
        project,
        documentHead,
        version,
        changesCount,
        recentChanges,
        persistedVersionInfo,
      ] = await Promise.all([
        this.projectRepo.findById(projectId),
        this.sessionRepo.getDocumentHead(projectId),
        this.sessionRepo.getDocumentVersion(projectId),
        this.sessionRepo.getDocumentChangesCount(projectId),
        this.sessionRepo.getRecentDocumentChanges(projectId, 5),
        this.sessionRepo.getPersistedVersionInfo(projectId),
      ]);

      return {
        project,
        realtimeInfo: {
          documentHead,
          version,
          changesCount,
          recentChanges,
          persistedVersionInfo,
        },
      };
    } catch (error) {
      console.error("Error getting project with realtime info:", error);
      return {
        project: null,
        realtimeInfo: {
          documentHead: null,
          version: null,
          changesCount: 0,
          recentChanges: [],
          persistedVersionInfo: { version: null, time: null, expireTime: null },
        },
      };
    }
  }

  /**
   * Search projects by name
   */
  public async searchProjects(
    namePattern: string,
    limit = 20,
  ): Promise<OverleafProject[]> {
    try {
      const filter = {
        name: { $regex: namePattern, $options: "i" },
      };
      return await this.projectRepo.findMany(filter, { limit });
    } catch (error) {
      console.error("Error searching projects:", error);
      return [];
    }
  }

  /**
   * Get project collaboration info
   */
  public async getProjectCollaborationInfo(projectId: string): Promise<{
    project: OverleafProject | null;
    ownerInfo: any;
    collaborators: any[];
    readOnlyUsers: any[];
  }> {
    try {
      const project = await this.projectRepo.findById(projectId);
      if (!project) {
        return {
          project: null,
          ownerInfo: null,
          collaborators: [],
          readOnlyUsers: [],
        };
      }

      // Batch fetch all user info to avoid N+1 queries
      const allUserIds = [
        project.owner_ref,
        ...project.collaberator_refs,
        ...project.readOnly_refs,
      ];
      const users = await this.userRepo.findByIds(allUserIds);
      const userMap = new Map(users.map((u) => [u._id, u]));

      // Assemble collaboration info
      const ownerInfo = userMap.get(project.owner_ref);
      const collaborators = project.collaberator_refs
        .map((id) => userMap.get(id))
        .filter(Boolean);
      const readOnlyUsers = project.readOnly_refs
        .map((id) => userMap.get(id))
        .filter(Boolean);

      return {
        project,
        ownerInfo,
        collaborators,
        readOnlyUsers,
      };
    } catch (error) {
      console.error("Error getting project collaboration info:", error);
      return {
        project: null,
        ownerInfo: null,
        collaborators: [],
        readOnlyUsers: [],
      };
    }
  }

  /**
   * Get projects that need export (for batch operations)
   */
  public async getProjectsForBatchExport(
    options: {
      includeInactive?: boolean;
      lastExportBefore?: Date;
      ownersOnly?: string[];
    } = {},
  ): Promise<{
    projects: OverleafProject[];
    totalSize: number;
  }> {
    try {
      const filter: any = {};

      if (!options.includeInactive) {
        // Only include projects updated in the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        filter.lastUpdated = { $gte: sixMonthsAgo };
      }

      if (options.ownersOnly?.length) {
        filter.owner_ref = { $in: options.ownersOnly };
      }

      const [projects, total] = await Promise.all([
        this.projectRepo.findMany(filter, {
          limit: 1000, // Large limit for batch operations
        }),
        this.projectRepo.count(filter),
      ]);

      return {
        projects,
        totalSize: total,
      };
    } catch (error) {
      console.error("Error getting projects for batch export:", error);
      return {
        projects: [],
        totalSize: 0,
      };
    }
  }

  /**
   * Export all projects for a user with progress tracking
   */
  public async exportAllUserProjectsWithProgress(
    userId: string,
    outputDir: string,
    onProgress?: (
      current: number,
      total: number,
      currentProject?: string,
    ) => void,
  ): Promise<{
    success: boolean;
    exportedFiles: string[];
    errors: string[];
    totalProjects: number;
  }> {
    try {
      // Get user projects
      const projects = await this.projectRepo.findByOwner(userId);
      const totalProjects = projects.length;

      if (totalProjects === 0) {
        return {
          success: true,
          exportedFiles: [],
          errors: [],
          totalProjects: 0,
        };
      }

      const exportedFiles: string[] = [];
      const errors: string[] = [];

      // Export each project individually with progress tracking
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        onProgress?.(i + 1, totalProjects, project.name);

        const outputPath = `${outputDir}/${project._id}_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}.zip`;

        try {
          const result = await this.exportUserProjects({
            projectId: project._id,
            outputPath,
          });

          if (result.success) {
            exportedFiles.push(outputPath);
          } else {
            errors.push(`Failed to export ${project.name}: ${result.error}`);
          }
        } catch (error) {
          errors.push(
            `Error exporting ${project.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return {
        success: errors.length === 0,
        exportedFiles,
        errors,
        totalProjects,
      };
    } catch (error) {
      return {
        success: false,
        exportedFiles: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
        totalProjects: 0,
      };
    }
  }
}
