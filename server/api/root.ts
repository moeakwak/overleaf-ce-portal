import { router, createCallerFactory } from "./trpc";
import { systemRouter } from "./routers/system";

export const appRouter = router({
  system: systemRouter,
});

export type AppRouter = typeof appRouter;

export const createTRPCCaller = createCallerFactory(appRouter);
