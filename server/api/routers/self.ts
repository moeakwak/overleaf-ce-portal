import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { AppContext } from "@/server/context";
import type { OverleafUser } from "@/server/types/overleaf";
import { authenticatedProcedure, router } from "../trpc";

const appContext = AppContext.getInstance();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long");

// Portal password policy: >8 chars (i.e., at least 9) and at least three of the four categories
// uppercase, lowercase, digit, special character.
const portalPasswordSchema = z
  .string()
  .min(9, "Password must be at least 9 characters long")
  .refine(
    (value) => {
      let categories = 0;
      if (/[A-Z]/.test(value)) categories += 1;
      if (/[a-z]/.test(value)) categories += 1;
      if (/[0-9]/.test(value)) categories += 1;
      if (/[^A-Za-z0-9]/.test(value)) categories += 1;
      return categories >= 3;
    },
    {
      message:
        "Password must include at least three of: uppercase, lowercase, number, special character",
    },
  );

function normalizeOverleafUserId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeObjectId = value as {
      toHexString?: () => string;
      toString?: () => string;
    };

    if (typeof maybeObjectId.toHexString === "function") {
      const hexValue = maybeObjectId.toHexString();
      if (typeof hexValue === "string" && hexValue.length > 0) {
        return hexValue;
      }
    }

    if (typeof maybeObjectId.toString === "function") {
      const stringValue = maybeObjectId.toString();
      if (stringValue && stringValue !== "[object Object]") {
        return stringValue;
      }
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to normalize Overleaf user identifier",
  });
}

function mapOverleafUserToSummary(user: OverleafUser) {
  return {
    id: normalizeOverleafUserId(user._id),
    email: user.email,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    isAdmin: user.isAdmin ?? false,
    loginCount: user.loginCount ?? 0,
    signUpDate: user.signUpDate ?? null,
    lastLoggedIn: user.lastLoggedIn ?? null,
    lastActive: user.lastActive ?? null,
  };
}

async function getCurrentPortalUser(portalUserId: string) {
  const portalUserService = appContext.getPortalUserService();
  const portalUser = await portalUserService.getPortalUserById(portalUserId);

  if (!portalUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Portal user not found",
    });
  }

  return portalUser;
}

export const selfRouter = router({
  overview: authenticatedProcedure.query(async ({ ctx }) => {
    const session = ctx.session;
    const portalUserService = appContext.getPortalUserService();
    const overleafUserService = appContext.getOverleafUserService();
    const _systemService = appContext.getOverleafSystemService();

    const portalUser = await getCurrentPortalUser(session.user.id);
    const portalAccounts = await db
      .select({
        providerId: account.providerId,
        accountId: account.accountId,
        createdAt: account.createdAt,
        password: account.password,
      })
      .from(account)
      .where(eq(account.userId, portalUser.id));
    const hasCredentialPassword = portalAccounts.some(
      (item) => item.providerId === "credential" && item.password,
    );

    const links = (portalUser.overleafLinks ?? []).map((link) => ({
      overleafUserId: normalizeOverleafUserId(link.overleafUserId),
      overleafUserEmail: link.overleafUserEmail,
    }));

    // Check if Overleaf instance is available
    const overleafInstance = appContext.getOverleafInstance();
    const isOverleafAvailable = await overleafInstance.isAvailable();

    // Always show linkedAccounts based on database links
    // Only try to fetch profile details if Overleaf is available
    let linkedAccounts: Array<{
      overleafUserId: string;
      overleafUserEmail: string | null;
      profile: ReturnType<typeof mapOverleafUserToSummary> | null;
    }> = [];

    if (isOverleafAvailable) {
      try {
        const overleafIds = Array.from(
          new Set(links.map((link) => link.overleafUserId)),
        );
        const overleafUsers =
          await overleafUserService.getUsersByIds(overleafIds);
        const overleafSummaries = overleafUsers.map((user) =>
          mapOverleafUserToSummary(user),
        );
        const overleafUserMap = new Map(
          overleafSummaries.map((summary) => [summary.id, summary]),
        );

        linkedAccounts = links.map((link) => ({
          overleafUserId: link.overleafUserId,
          overleafUserEmail: link.overleafUserEmail,
          profile: overleafUserMap.get(link.overleafUserId) ?? null,
        }));
      } catch (error) {
        console.error(
          "Failed to fetch Overleaf user profiles, using database links only:",
          error,
        );
        // Fall back to database links without profiles
        linkedAccounts = links.map((link) => ({
          overleafUserId: link.overleafUserId,
          overleafUserEmail: link.overleafUserEmail,
          profile: null,
        }));
      }
    } else {
      // Overleaf unavailable, use database links only
      linkedAccounts = links.map((link) => ({
        overleafUserId: link.overleafUserId,
        overleafUserEmail: link.overleafUserEmail,
        profile: null,
      }));
    }

    const normalizedEmail = portalUser.email.trim().toLowerCase();
    let linkedByOther: { id: string; name: string; email: string } | null =
      null;
    let linkedToCurrentUser = false;
    let overleafUserForEmail = null;

    // Only query Overleaf for primary email status if available
    if (isOverleafAvailable) {
      try {
        overleafUserForEmail =
          await overleafUserService.getUserByEmail(normalizedEmail);

        if (overleafUserForEmail) {
          const normalizedOverleafUserId = normalizeOverleafUserId(
            overleafUserForEmail._id,
          );
          const linkOwner =
            await portalUserService.findPortalUserByOverleafUserId(
              normalizedOverleafUserId,
            );

          if (linkOwner) {
            if (linkOwner.id === portalUser.id) {
              linkedToCurrentUser = true;
            } else {
              linkedByOther = linkOwner;
            }
          }

          if (!linkedToCurrentUser) {
            linkedToCurrentUser = links.some(
              (link) => link.overleafUserId === normalizedOverleafUserId,
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to fetch Overleaf user by email, skipping primary email status:",
          error,
        );
      }
    } else {
      // When Overleaf is unavailable, determine linkedToCurrentUser from database links only
      linkedToCurrentUser = links.length > 0;
    }

    return {
      portalUser: {
        id: portalUser.id,
        name: portalUser.name,
        email: portalUser.email,
        role: portalUser.role,
        overleafLinks: portalUser.overleafLinks,
        createdAt: portalUser.createdAt,
        updatedAt: portalUser.updatedAt,
      },
      linkedAccounts,
      primaryEmailStatus: {
        email: normalizedEmail,
        overleafUser: overleafUserForEmail
          ? mapOverleafUserToSummary(overleafUserForEmail)
          : null,
        linkedToCurrentUser,
        linkedByOther,
      },
      auth: {
        passwordLoginEnabled: env.ENABLE_PASSWORD_LOGIN,
        oidcLoginEnabled: env.ENABLE_OIDC_LOGIN,
        oidcProviderId: env.OIDC_PROVIDER_ID,
        oidcProviderName: env.OIDC_PROVIDER_NAME,
        oidcConnections: portalAccounts
          .filter((item) => item.providerId === env.OIDC_PROVIDER_ID)
          .map((item) => ({
            providerId: item.providerId,
            accountId: item.accountId,
            linkedAt: item.createdAt,
          })),
        hasPassword: hasCredentialPassword,
      },
      overleafInstanceAvailable: isOverleafAvailable,
    };
  }),

  createOverleafAccount: authenticatedProcedure
    .input(
      z.object({
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session;
      const overleafUserService = appContext.getOverleafUserService();
      const portalUserService = appContext.getPortalUserService();

      const portalUser = await getCurrentPortalUser(session.user.id);
      const normalizedEmail = portalUser.email.trim().toLowerCase();

      const existingUser =
        await overleafUserService.getUserByEmail(normalizedEmail);

      if (existingUser) {
        const existingUserId = normalizeOverleafUserId(existingUser._id);
        const linkOwner =
          await portalUserService.findPortalUserByOverleafUserId(
            existingUserId,
          );

        if (linkOwner && linkOwner.id !== portalUser.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Overleaf account is already linked to ${linkOwner.name}`,
          });
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: "Overleaf account already exists. Please link it instead.",
        });
      }

      const creationResult = await overleafUserService.createUser({
        email: normalizedEmail,
        isAdmin: false,
      });

      if (!creationResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: creationResult.error ?? "Failed to create Overleaf account",
        });
      }

      const passwordResult = await overleafUserService.setUserPassword(
        normalizedEmail,
        input.password,
      );

      if (!passwordResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            passwordResult.error ?? "Failed to set Overleaf account password",
        });
      }

      const createdUser =
        await overleafUserService.getUserByEmail(normalizedEmail);

      if (!createdUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load created Overleaf account",
        });
      }

      const createdUserId = normalizeOverleafUserId(createdUser._id);
      const existingLinks = (portalUser.overleafLinks ?? []).map((link) => ({
        overleafUserId: normalizeOverleafUserId(link.overleafUserId),
        overleafUserEmail: link.overleafUserEmail,
      }));
      const alreadyLinked = existingLinks.some(
        (link) => link.overleafUserId === createdUserId,
      );

      if (!alreadyLinked) {
        const updated = await portalUserService.updatePortalUser({
          id: portalUser.id,
          overleafLinks: [
            ...existingLinks,
            {
              overleafUserId: createdUserId,
              overleafUserEmail: createdUser.email,
            },
          ],
        });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to associate Overleaf account with portal profile",
          });
        }
      }

      return {
        success: true,
        overleafUser: mapOverleafUserToSummary(createdUser),
      };
    }),

  linkOverleafAccount: authenticatedProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session;
      const overleafUserService = appContext.getOverleafUserService();
      const portalUserService = appContext.getPortalUserService();

      const portalUser = await getCurrentPortalUser(session.user.id);
      const normalizedEmail = input.email.trim().toLowerCase();

      const verification = await overleafUserService.verifyUserPassword(
        normalizedEmail,
        input.password,
      );

      if (!verification.success || !verification.user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: verification.error ?? "Invalid Overleaf credentials",
        });
      }

      const verifiedUser = verification.user;
      const verifiedUserId = normalizeOverleafUserId(verifiedUser._id);
      const existingLinks = (portalUser.overleafLinks ?? []).map((link) => ({
        overleafUserId: normalizeOverleafUserId(link.overleafUserId),
        overleafUserEmail: link.overleafUserEmail,
      }));

      const linkOwner =
        await portalUserService.findPortalUserByOverleafUserId(verifiedUserId);

      if (linkOwner && linkOwner.id !== portalUser.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Overleaf account is already linked to ${linkOwner.name}`,
        });
      }

      const alreadyLinked = existingLinks.some(
        (link) => link.overleafUserId === verifiedUserId,
      );

      if (!alreadyLinked) {
        const updated = await portalUserService.updatePortalUser({
          id: portalUser.id,
          overleafLinks: [
            ...existingLinks,
            {
              overleafUserId: verifiedUserId,
              overleafUserEmail: verifiedUser.email,
            },
          ],
        });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save Overleaf account link",
          });
        }
      }

      return {
        success: true,
        overleafUser: mapOverleafUserToSummary(verifiedUser),
      };
    }),

  linkPrimaryOverleafAccount: authenticatedProcedure.mutation(
    async ({ ctx }) => {
      const session = ctx.session;
      const overleafUserService = appContext.getOverleafUserService();
      const portalUserService = appContext.getPortalUserService();

      const portalUser = await getCurrentPortalUser(session.user.id);
      const normalizedEmail = portalUser.email.trim().toLowerCase();

      const existingUser =
        await overleafUserService.getUserByEmail(normalizedEmail);

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Overleaf account not found for portal email",
        });
      }

      const existingUserId = normalizeOverleafUserId(existingUser._id);

      const linkOwner =
        await portalUserService.findPortalUserByOverleafUserId(existingUserId);

      if (linkOwner && linkOwner.id !== portalUser.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Overleaf account is already linked to ${linkOwner.name}`,
        });
      }

      const existingLinks = (portalUser.overleafLinks ?? []).map((link) => ({
        overleafUserId: normalizeOverleafUserId(link.overleafUserId),
        overleafUserEmail: link.overleafUserEmail,
      }));

      const alreadyLinked = existingLinks.some(
        (link) => link.overleafUserId === existingUserId,
      );

      if (!alreadyLinked) {
        const updated = await portalUserService.updatePortalUser({
          id: portalUser.id,
          overleafLinks: [
            ...existingLinks,
            {
              overleafUserId: existingUserId,
              overleafUserEmail: existingUser.email,
            },
          ],
        });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save Overleaf account link",
          });
        }
      }

      return {
        success: true,
        overleafUser: mapOverleafUserToSummary(existingUser),
      };
    },
  ),

  unlinkOverleafAccount: authenticatedProcedure
    .input(
      z.object({
        overleafUserId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session;
      const portalUserService = appContext.getPortalUserService();

      const portalUser = await getCurrentPortalUser(session.user.id);
      const normalizedTargetId = normalizeOverleafUserId(input.overleafUserId);

      const existingLinks = (portalUser.overleafLinks ?? []).map((link) => ({
        overleafUserId: normalizeOverleafUserId(link.overleafUserId),
        overleafUserEmail: link.overleafUserEmail,
      }));

      const linkExists = existingLinks.some(
        (link) => link.overleafUserId === normalizedTargetId,
      );

      if (!linkExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Overleaf account link not found",
        });
      }

      const updatedLinks = existingLinks.filter(
        (link) => link.overleafUserId !== normalizedTargetId,
      );

      const updated = await portalUserService.updatePortalUser({
        id: portalUser.id,
        overleafLinks: updatedLinks,
      });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove Overleaf account link",
        });
      }

      return {
        success: true,
      };
    }),

  changePortalPassword: authenticatedProcedure
    .input(
      z.object({
        currentPassword: passwordSchema,
        newPassword: portalPasswordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.ENABLE_PASSWORD_LOGIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Password login is disabled",
        });
      }

      try {
        await auth.api.changePassword({
          headers: ctx.headers,
          body: {
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
            revokeOtherSessions: true,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update portal password";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      return {
        success: true,
      };
    }),

  setPortalPassword: authenticatedProcedure
    .input(
      z.object({
        newPassword: portalPasswordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.ENABLE_PASSWORD_LOGIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Password login is disabled",
        });
      }

      try {
        await auth.api.setPassword({
          headers: ctx.headers,
          body: {
            newPassword: input.newPassword,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to set portal password";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      return {
        success: true,
      };
    }),

  updateOverleafPassword: authenticatedProcedure
    .input(
      z.object({
        overleafUserId: z.string().min(1),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session;
      const overleafUserService = appContext.getOverleafUserService();

      const portalUser = await getCurrentPortalUser(session.user.id);
      const normalizedTargetId = normalizeOverleafUserId(input.overleafUserId);
      const link = (portalUser.overleafLinks ?? []).find(
        (item) =>
          normalizeOverleafUserId(item.overleafUserId) === normalizedTargetId,
      );

      if (!link) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Overleaf account is not linked to the current user",
        });
      }
      // Prefer updating by email stored in link to avoid _id representation issues
      let targetEmail = link.overleafUserEmail ?? null;
      if (!targetEmail) {
        const overleafUser =
          await overleafUserService.getUserById(normalizedTargetId);
        if (!overleafUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Overleaf account not found",
          });
        }
        targetEmail = overleafUser.email;
      }

      const result = await overleafUserService.setUserPassword(
        targetEmail,
        input.password,
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to update password",
        });
      }

      return {
        success: true,
      };
    }),
});
