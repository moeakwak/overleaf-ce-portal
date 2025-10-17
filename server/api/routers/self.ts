import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppContext } from "@/server/context";
import type { OverleafUser } from "@/server/types/overleaf";
import { authenticatedProcedure, router } from "../trpc";

const appContext = AppContext.getInstance();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long");

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

    const portalUser = await getCurrentPortalUser(session.user.id);
    const links = (portalUser.overleafLinks ?? []).map((link) => ({
      overleafUserId: normalizeOverleafUserId(link.overleafUserId),
      overleafUserEmail: link.overleafUserEmail,
    }));

    const overleafIds = Array.from(
      new Set(links.map((link) => link.overleafUserId)),
    );
    const overleafUsers = await overleafUserService.getUsersByIds(overleafIds);
    const overleafSummaries = overleafUsers.map((user) =>
      mapOverleafUserToSummary(user),
    );
    const overleafUserMap = new Map(
      overleafSummaries.map((summary) => [summary.id, summary]),
    );

    const linkedAccounts = links.map((link) => ({
      overleafUserId: link.overleafUserId,
      overleafUserEmail: link.overleafUserEmail,
      profile: overleafUserMap.get(link.overleafUserId) ?? null,
    }));

    const normalizedEmail = portalUser.email.trim().toLowerCase();
    const overleafUserForEmail =
      await overleafUserService.getUserByEmail(normalizedEmail);

    let linkedByOther: { id: string; name: string; email: string } | null =
      null;
    let linkedToCurrentUser = false;

    if (overleafUserForEmail) {
      const normalizedOverleafUserId = normalizeOverleafUserId(
        overleafUserForEmail._id,
      );
      const linkOwner = await portalUserService.findPortalUserByOverleafUserId(
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

    return {
      portalUser: {
        id: portalUser.id,
        name: portalUser.name,
        email: portalUser.email,
        role: portalUser.role,
        overleafLinks: portalUser.overleafLinks,
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
      const portalUserService = appContext.getPortalUserService();

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

      const overleafUser =
        await overleafUserService.getUserById(normalizedTargetId);

      if (!overleafUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Overleaf account not found",
        });
      }

      const result = await overleafUserService.setUserPassword(
        overleafUser.email,
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
