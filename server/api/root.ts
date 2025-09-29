import { projectRouter } from "./routers/project";
import { systemRouter } from "./routers/system";
import { userRouter } from "./routers/user";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
  system: systemRouter,
  user: userRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;

export const createTRPCCaller = createCallerFactory(appRouter);
