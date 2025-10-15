import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppContext } from "@/server/context";
import { protectedProcedure, router } from "../trpc";

const appContext = AppContext.getInstance();

// Input schemas
const projectListOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["name", "lastUpdated", "owner_ref"]).default("lastUpdated"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  searchName: z.string().optional(),
  ownerId: z.string().optional(),
});

const projectExportSchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  outputPath: z.string(),
  exportAll: z.boolean().default(false),
});

const batchExportOptionsSchema = z.object({
  includeInactive: z.boolean().optional(),
  lastExportBefore: z.date().optional(),
  ownersOnly: z.array(z.string()).optional(),
});

export const projectRouter = router({
  // Get project statistics
  getStats: protectedProcedure.query(async () => {
    try {
      const projectService = appContext.getOverleafProjectService();
      return await projectService.getProjectStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get project stats",
      });
    }
  }),

  // List projects with pagination and filtering
  list: protectedProcedure
    .input(projectListOptionsSchema)
    .query(async ({ input }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.listProjects(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to list projects",
        });
      }
    }),

  // Get project by ID
  getById: protectedProcedure.input(z.string()).query(async ({ input: id }) => {
    try {
      const projectService = appContext.getOverleafProjectService();
      const project = await projectService.getProjectById(id);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return project;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get project",
      });
    }
  }),

  // Get projects by owner
  getByOwner: protectedProcedure
    .input(z.string())
    .query(async ({ input: ownerId }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.getProjectsByOwner(ownerId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get projects by owner",
        });
      }
    }),

  // Search projects by name pattern
  search: protectedProcedure
    .input(
      z.object({
        namePattern: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.searchProjects(
          input.namePattern,
          input.limit,
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to search projects",
        });
      }
    }),

  // Get project with realtime info
  getWithRealtimeInfo: protectedProcedure
    .input(z.string())
    .query(async ({ input: projectId }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.getProjectWithRealtimeInfo(projectId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get project with realtime info",
        });
      }
    }),

  // Get project collaboration info
  getCollaborationInfo: protectedProcedure
    .input(z.string())
    .query(async ({ input: projectId }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.getProjectCollaborationInfo(projectId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get project collaboration info",
        });
      }
    }),

  // Get project documents
  getDocuments: protectedProcedure
    .input(z.string())
    .query(async ({ input: projectId }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.getProjectDocuments(projectId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get project documents",
        });
      }
    }),

  // Export user projects
  export: protectedProcedure
    .input(projectExportSchema)
    .mutation(async ({ input }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        const result = await projectService.exportUserProjects(input);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to export projects",
          });
        }

        return {
          success: true,
          exportPath: result.exportPath,
          message: "Projects exported successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to export projects",
        });
      }
    }),

  // Get projects for batch export info
  getBatchExportInfo: protectedProcedure
    .input(batchExportOptionsSchema)
    .query(async ({ input }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        return await projectService.getProjectsForBatchExport(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get batch export info",
        });
      }
    }),

  // Get recent projects (for dashboard)
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        days: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ input }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        const since = new Date();
        since.setDate(since.getDate() - input.days);

        return await projectService.listProjects({
          limit: input.limit,
          sortBy: "lastUpdated",
          sortOrder: "desc",
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get recent projects",
        });
      }
    }),

  // Export all user projects with progress tracking
  exportAllWithProgress: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        outputDir: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const projectService = appContext.getOverleafProjectService();
        const result = await projectService.exportAllUserProjectsWithProgress(
          input.userId,
          input.outputDir,
          (current, total, projectName) => {
            // TODO: Implement progress tracking via WebSocket or Server-Sent Events
            console.log(
              `Export progress: ${current}/${total} - ${projectName}`,
            );
          },
        );

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              result.errors?.join(", ") || "Failed to export all user projects",
          });
        }

        return {
          success: true,
          exportedFiles: result.exportedFiles,
          totalProjects: result.totalProjects,
          message: `Successfully exported ${result.totalProjects} projects`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to export all user projects",
        });
      }
    }),
});
