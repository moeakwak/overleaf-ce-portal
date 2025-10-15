"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

export const trpc = createTRPCReact<AppRouter>();

// Export type helpers for type inference
export type RouterOutputs = inferRouterOutputs<AppRouter>;
