import { TRPCError } from "@trpc/server";
import { AppContext } from "@/server/context";
import { protectedProcedure, router } from "../trpc";

const appContext = AppContext.getInstance();

export const systemRouter = router({
  health: protectedProcedure.query(async () => {
    try {
      const systemService = appContext.getOverleafSystemService();
      return await systemService.getSystemHealth();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
  stats: protectedProcedure.query(async () => {
    try {
      const systemService = appContext.getOverleafSystemService();
      return await systemService.getSystemStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
});
