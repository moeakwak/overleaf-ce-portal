import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { UserService } from "@/server/services/user-service";
import { protectedProcedure, router } from "../trpc";

const userService = new UserService();

// Input schemas
const createUserSchema = z.object({
  email: z.string().email(),
  isAdmin: z.boolean().default(false),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const userListOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z
    .enum(["email", "signUpDate", "lastLoggedIn", "loginCount"])
    .default("signUpDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  searchEmail: z.string().optional(),
});

const deleteUserSchema = z.object({
  email: z.string().email(),
  skipEmail: z.boolean().default(false),
});

const upgradeUserFeaturesSchema = z.object({
  email: z.string().email(),
  features: z.record(z.string(), z.any()).optional(),
});

export const userRouter = router({
  // Get user statistics
  getStats: protectedProcedure.query(async () => {
    try {
      return await userService.getUserStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to get user stats",
      });
    }
  }),

  // List users with pagination and filtering
  list: protectedProcedure
    .input(userListOptionsSchema)
    .query(async ({ input }) => {
      try {
        return await userService.listUsers(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to list users",
        });
      }
    }),

  // Get user by ID
  getById: protectedProcedure.input(z.string()).query(async ({ input: id }) => {
    try {
      const user = await userService.getUserById(id);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
      return user;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to get user",
      });
    }
  }),

  // Get user by email
  getByEmail: protectedProcedure
    .input(z.string().email())
    .query(async ({ input: email }) => {
      try {
        const user = await userService.getUserByEmail(email);
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        return user;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to get user",
        });
      }
    }),

  // Search users by email pattern
  search: protectedProcedure
    .input(
      z.object({
        emailPattern: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await userService.searchUsers(input.emailPattern, input.limit);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to search users",
        });
      }
    }),

  // Create a new user
  create: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await userService.createUser(input);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to create user",
          });
        }

        return {
          success: true,
          user: result.user,
          message: "User created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create user",
        });
      }
    }),

  // Delete a user
  delete: protectedProcedure
    .input(deleteUserSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await userService.deleteUser(
          input.email,
          input.skipEmail,
        );

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to delete user",
          });
        }

        return {
          success: true,
          message: "User deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete user",
        });
      }
    }),

  // Upgrade user features
  upgradeFeatures: protectedProcedure
    .input(upgradeUserFeaturesSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await userService.upgradeUserFeatures(
          input.email,
          input.features,
        );

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to upgrade user features",
          });
        }

        return {
          success: true,
          message: "User features upgraded successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to upgrade user features",
        });
      }
    }),

  // Get user sessions
  getSessions: protectedProcedure
    .input(z.string())
    .query(async ({ input: userId }) => {
      try {
        return await userService.getUserSessions(userId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get user sessions",
        });
      }
    }),

  // Get active sessions
  getActiveSessions: protectedProcedure.query(async () => {
    try {
      return await userService.getActiveSessions();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get active sessions",
      });
    }
  }),

  // Clear expired sessions
  clearExpiredSessions: protectedProcedure.mutation(async () => {
    try {
      const clearedCount = await userService.clearExpiredSessions();
      return {
        success: true,
        clearedCount,
        message: `Cleared ${clearedCount} expired sessions`,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to clear expired sessions",
      });
    }
  }),

  // Get user with projects summary
  getWithProjectsSummary: protectedProcedure
    .input(z.string())
    .query(async ({ input: userId }) => {
      try {
        return await userService.getUserWithProjectsSummary(userId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get user with projects summary",
        });
      }
    }),
});
