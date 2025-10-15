import { overleafUserRouter } from "./routers/overleaf-user";
import { portalUserRouter } from "./routers/portal-user";
import { projectRouter } from "./routers/project";
import { systemRouter } from "./routers/system";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
  system: systemRouter,
  overleafUser: overleafUserRouter,
  portalUser: portalUserRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;

export const createTRPCCaller = createCallerFactory(appRouter);
