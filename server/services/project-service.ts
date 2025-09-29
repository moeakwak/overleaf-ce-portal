import { DockerCommandExecutor } from "../managers/docker-executor";
import { MongoDBManager } from "../managers/mongodb";
import { RedisManager } from "../managers/redis";
import type {
  OverleafDoc,
  OverleafProject,
  ProjectExportOptions,
  ProjectListOptions,
  ScriptExecutionResult,
} from "../types/overleaf";

export class ProjectService {
  private dockerExecutor: DockerCommandExecutor;
  private mongoManager: MongoDBManager;
  private redisManager: RedisManager;

  constructor() {
    this.dockerExecutor = DockerCommandExecutor.getInstance();
    this.mongoManager = MongoDBManager.getInstance();
    this.redisManager = RedisManager.getInstance();
  }

  /**
   * Export user projects
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
        const user = await this.mongoManager.findUserById(options.userId);
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
        const project = await this.mongoManager.findProjectById(
          options.projectId,
        );
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
   * List user projects via script
   */
  public async listUserProjectsViaScript(userId: string): Promise<{
    success: boolean;
    projects: string[];
    executionResult: ScriptExecutionResult;
    error?: string;
  }> {
    try {
      // Validate user exists
      const user = await this.mongoManager.findUserById(userId);
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
      return await this.mongoManager.findProjectById(id);
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
      return await this.mongoManager.findProjectsByOwner(ownerId);
    } catch (error) {
      console.error("Error getting projects by owner:", error);
      return [];
    }
  }

  /**
   * List projects with pagination and filtering
   */
  public async listProjects(options: ProjectListOptions = {}): Promise<{
    projects: OverleafProject[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      return await this.mongoManager.listProjects(options);
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
      return await this.mongoManager.getProjectStats();
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
      return await this.mongoManager.findDocsByProject(projectId);
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
      return await this.mongoManager.findDocById(id);
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
        this.mongoManager.findProjectById(projectId),
        this.redisManager.getDocumentHead(projectId),
        this.redisManager.getDocumentVersion(projectId),
        this.redisManager.getDocumentChangesCount(projectId),
        this.redisManager.getRecentDocumentChanges(projectId, 5),
        this.redisManager.getPersistedVersionInfo(projectId),
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
      const result = await this.mongoManager.listProjects({
        nameFilter: namePattern,
        limit,
      });
      return result.projects;
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
      const project = await this.mongoManager.findProjectById(projectId);
      if (!project) {
        return {
          project: null,
          ownerInfo: null,
          collaborators: [],
          readOnlyUsers: [],
        };
      }

      // Get owner and collaborator details
      const [ownerInfo, collaborators, readOnlyUsers] = await Promise.all([
        this.mongoManager.findUserById(project.owner_ref),
        Promise.all(
          project.collaberator_refs.map((id) =>
            this.mongoManager.findUserById(id),
          ),
        ),
        Promise.all(
          project.readOnly_refs.map((id) => this.mongoManager.findUserById(id)),
        ),
      ]);

      return {
        project,
        ownerInfo,
        collaborators: collaborators.filter(Boolean),
        readOnlyUsers: readOnlyUsers.filter(Boolean),
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

      const projects = await this.mongoManager.listProjects({
        ...filter,
        limit: 1000, // Large limit for batch operations
      });

      return {
        projects: projects.projects,
        totalSize: projects.total,
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
      const projects = await this.mongoManager.findProjectsByOwner(userId);
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
