import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppContext } from "@/server/context";
import { protectedProcedure, router } from "../trpc";

const appContext = AppContext.getInstance();

const portalUserListSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  sortBy: z.enum(["createdAt", "name", "email", "role"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const portalUserIdSchema = z.string().min(1);

const portalUserLinkSchema = z.object({
  overleafUserId: z.string().min(1, "Overleaf user ID is required"),
  overleafUserEmail: z.string().email("Invalid Overleaf user email").nullable(),
});

const updatePortalUserSchema = z.object({
  id: z.string().min(1, "Portal user ID is required"),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "super-admin"]).optional(),
  overleafLinks: z.array(portalUserLinkSchema).optional(),
});

export const portalUserRouter = router({
  list: protectedProcedure
    .input(portalUserListSchema)
    .query(async ({ input }) => {
      try {
        const portalUserService = appContext.getPortalUserService();
        return await portalUserService.listPortalUsers(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to list portal users",
        });
      }
    }),

  getById: protectedProcedure
    .input(portalUserIdSchema)
    .query(async ({ input }) => {
      try {
        const portalUserService = appContext.getPortalUserService();
        const portalUser = await portalUserService.getPortalUserById(input);
        if (!portalUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Portal user not found",
          });
        }
        return portalUser;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get portal user",
        });
      }
    }),

  update: protectedProcedure
    .input(updatePortalUserSchema)
    .mutation(async ({ input }) => {
      try {
        const portalUserService = appContext.getPortalUserService();
        const updated = await portalUserService.updatePortalUser(input);
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Portal user not found",
          });
        }
        return {
          success: true,
          user: updated,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update portal user",
        });
      }
    }),

  getStats: protectedProcedure.query(async () => {
    try {
      const portalUserService = appContext.getPortalUserService();
      return await portalUserService.getPortalUserStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get portal user stats",
      });
    }
  }),
});
