import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { SystemService } from "@/server/services/system-service";

const systemService = new SystemService();

export const systemRouter = router({
  health: protectedProcedure.query(async () => {
    try {
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
      return await systemService.getSystemStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
});
