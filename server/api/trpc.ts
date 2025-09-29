import { initTRPC } from "@trpc/server";
import SuperJSON from "superjson";
import type { Session } from "@/lib/auth";

type CreateContextOptions = {
  headers: Headers;
  session?: Session | null;
};

const createInnerTRPCContext = ({
  headers,
  session = null,
}: CreateContextOptions) => ({
  headers,
  session,
});

export const createTRPCContext = async (
  opts: CreateContextOptions,
): Promise<ReturnType<typeof createInnerTRPCContext>> => {
  // TODO: integrate Better Auth session extraction when auth flow is ready.
  return createInnerTRPCContext({
    headers: opts.headers,
    session: opts.session ?? null,
  });
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: SuperJSON,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const placeholderAuthMiddleware = t.middleware(async ({ ctx, next }) => {
  // TODO: enforce authentication once Better Auth session handling is in place.
  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(placeholderAuthMiddleware);

export const createCallerFactory = t.createCallerFactory;
