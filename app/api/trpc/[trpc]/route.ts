import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async () =>
      createTRPCContext({
        headers: request.headers,
      }),
  });

export { handler as GET, handler as POST };

