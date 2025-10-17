/**
 * Application instrumentation for lifecycle management.
 *
 * This file is automatically loaded by Next.js before the application starts.
 * It's used to initialize application-level resources and set up cleanup handlers.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

// Explicitly declare this file only runs in Node.js runtime
export const runtime = "nodejs";

import { AppContext } from "./server/context";

const nodeProcess: NodeJS.Process | null =
  typeof globalThis.process !== "undefined"
    ? (globalThis.process as NodeJS.Process)
    : null;

const signalHandlers: Partial<
  Record<"SIGTERM" | "SIGINT", NodeJS.SignalsListener>
> = {};
let uncaughtExceptionHandler: ((error: Error) => void) | undefined;
let unhandledRejectionHandler:
  | ((reason: unknown, promise: Promise<unknown>) => void)
  | undefined;
let cleanupInProgress = false;

const registerLifecycleHandlers = (cleanup: () => Promise<void>) => {
  if (!nodeProcess) {
    console.warn(
      "[Instrumentation] Node.js process API unavailable; skipping lifecycle handlers.",
    );
    return;
  }

  cleanupInProgress = false;

  const runCleanup = async () => {
    if (cleanupInProgress) {
      return;
    }
    cleanupInProgress = true;

    console.log("[Instrumentation] Shutting down application...");
    try {
      await cleanup();
      console.log("[Instrumentation] Application shut down successfully");
      nodeProcess.exit(0);
    } catch (error) {
      console.error("[Instrumentation] Error during shutdown:", error);
      nodeProcess.exit(1);
    }
  };

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    const existingHandler = signalHandlers[signal];
    if (existingHandler) {
      nodeProcess.removeListener(signal, existingHandler);
    }

    const handler: NodeJS.SignalsListener = () => {
      void runCleanup();
    };

    signalHandlers[signal] = handler;
    nodeProcess.once(signal, handler);
  }

  if (uncaughtExceptionHandler) {
    nodeProcess.removeListener("uncaughtException", uncaughtExceptionHandler);
  }
  uncaughtExceptionHandler = (error: Error) => {
    console.error("[Instrumentation] Uncaught exception:", error);
    void runCleanup();
  };
  nodeProcess.once("uncaughtException", uncaughtExceptionHandler);

  if (unhandledRejectionHandler) {
    nodeProcess.removeListener("unhandledRejection", unhandledRejectionHandler);
  }
  unhandledRejectionHandler = (reason: unknown, promise: Promise<unknown>) => {
    console.error(
      "[Instrumentation] Unhandled rejection at:",
      promise,
      "reason:",
      reason,
    );
    void runCleanup();
  };
  nodeProcess.once("unhandledRejection", unhandledRejectionHandler);
};

/**
 * Register function - called when the server starts
 *
 * This is the perfect place to:
 * - Initialize database connections
 * - Set up application context
 * - Register cleanup handlers
 */
export async function register() {
  // Only run on server side
  if (nodeProcess?.env?.NEXT_RUNTIME === "nodejs") {
    const appContext = AppContext.getInstance();

    if (appContext.isInitialized()) {
      registerLifecycleHandlers(() => appContext.cleanup());
      return;
    }

    console.log("[Instrumentation] Initializing application...");

    try {
      await appContext.initialize();
      console.log("[Instrumentation] Application initialized successfully");
    } catch (error) {
      console.error(
        "[Instrumentation] Failed to initialize application:",
        error,
      );
      // Let Next.js handle startup failures gracefully; still register cleanup handlers
    }

    registerLifecycleHandlers(() => appContext.cleanup());
  }
}
