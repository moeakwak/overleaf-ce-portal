import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import type { Session } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { AppContext } from "@/server/context";

type CreateContextOptions = {
  headers: Headers;
  session?: Session | null;
};

export const createTRPCContext = async (opts: CreateContextOptions) => {
  const session =
    opts.session ??
    (await auth.api.getSession({
      headers: opts.headers,
    }));

  return {
    headers: opts.headers,
    session,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: SuperJSON,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const sessionMiddleware = t.middleware(async ({ ctx, next }) => {
  const session = ctx.session;

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session,
    },
  });
});

const superAdminMiddleware = t.middleware(async ({ ctx, next }) => {
  const session = ctx.session;

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  if (session.user.role !== "super-admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator privileges are required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session,
    },
  });
});

const appContextMiddleware = t.middleware(async ({ next }) => {
  await AppContext.getInstance().ensureInitialized();
  return next();
});

export const authenticatedProcedure = t.procedure
  .use(sessionMiddleware)
  .use(appContextMiddleware);

export const protectedProcedure = t.procedure
  .use(sessionMiddleware)
  .use(superAdminMiddleware)
  .use(appContextMiddleware);

export const createCallerFactory = t.createCallerFactory;
