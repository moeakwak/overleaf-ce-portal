import { createServerSideHelpers } from "@trpc/react-query/server";
import SuperJSON from "superjson";
import { appRouter, createTRPCCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

export const createSSGHelpers = async (req: Request) => {
  const context = await createTRPCContext({
    headers: req.headers,
  });

  return createServerSideHelpers({
    router: appRouter,
    ctx: context,
    transformer: SuperJSON,
  });
};

export const createCaller = createTRPCCaller;
