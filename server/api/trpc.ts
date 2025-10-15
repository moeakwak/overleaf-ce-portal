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

const superAdminMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  if (ctx.session.user.role !== "super-admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator privileges are required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

const appContextMiddleware = t.middleware(async ({ next }) => {
  await AppContext.getInstance().ensureInitialized();
  return next();
});

export const protectedProcedure = t.procedure
  .use(superAdminMiddleware)
  .use(appContextMiddleware);

export const createCallerFactory = t.createCallerFactory;
