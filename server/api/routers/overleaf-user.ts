import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppContext } from "@/server/context";
import { protectedProcedure, router } from "../trpc";

const appContext = AppContext.getInstance();

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

const updateAdminStatusSchema = z.object({
  email: z.string().email(),
  isAdmin: z.boolean(),
});

const setPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const overleafUserRouter = router({
  // Get user statistics
  getStats: protectedProcedure.query(async () => {
    try {
      const userService = appContext.getOverleafUserService();
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
        const userService = appContext.getOverleafUserService();
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
      const userService = appContext.getOverleafUserService();
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
        const userService = appContext.getOverleafUserService();
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
        const userService = appContext.getOverleafUserService();
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
        const userService = appContext.getOverleafUserService();
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
        const userService = appContext.getOverleafUserService();
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

  // Update user admin status
  updateAdminStatus: protectedProcedure
    .input(updateAdminStatusSchema)
    .mutation(async ({ input }) => {
      try {
        const userService = appContext.getOverleafUserService();
        const result = await userService.updateAdminStatus(
          input.email,
          input.isAdmin,
        );

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to update admin status",
          });
        }

        return {
          success: true,
          message: "Admin status updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update admin status",
        });
      }
    }),

  // Set user password directly using bcrypt + MongoDB
  setPassword: protectedProcedure
    .input(setPasswordSchema)
    .mutation(async ({ input }) => {
      try {
        const userService = appContext.getOverleafUserService();
        const result = await userService.setUserPassword(
          input.email,
          input.password,
        );

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to update password",
          });
        }

        return {
          success: true,
          message: "Password updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update password",
        });
      }
    }),

  // Get user sessions
  getSessions: protectedProcedure
    .input(z.string())
    .query(async ({ input: userId }) => {
      try {
        const userService = appContext.getOverleafUserService();
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
      const userService = appContext.getOverleafUserService();
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
      const userService = appContext.getOverleafUserService();
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
        const userService = appContext.getOverleafUserService();
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
