/**
 * Application instrumentation for lifecycle management.
 *
 * This file is automatically loaded by Next.js before the application starts.
 * It's used to initialize application-level resources and set up cleanup handlers.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { AppContext } from "./server/context";

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
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Initializing application...");

    try {
      // Initialize the application context
      // This will:
      // 1. Create and connect the default Overleaf instance
      // 2. Establish MongoDB, Redis, and Docker connections
      // 3. Perform health checks
      await AppContext.getInstance().initialize();

      console.log("[Instrumentation] Application initialized successfully");

      // Register cleanup handlers for graceful shutdown
      const cleanup = async () => {
        console.log("[Instrumentation] Shutting down application...");
        try {
          await AppContext.getInstance().cleanup();
          console.log("[Instrumentation] Application shut down successfully");
          process.exit(0);
        } catch (error) {
          console.error("[Instrumentation] Error during shutdown:", error);
          process.exit(1);
        }
      };

      // Handle termination signals
      process.on("SIGTERM", cleanup);
      process.on("SIGINT", cleanup);

      // Handle uncaught errors
      process.on("uncaughtException", (error) => {
        console.error("[Instrumentation] Uncaught exception:", error);
        cleanup();
      });

      process.on("unhandledRejection", (reason, promise) => {
        console.error(
          "[Instrumentation] Unhandled rejection at:",
          promise,
          "reason:",
          reason,
        );
        cleanup();
      });
    } catch (error) {
      console.error(
        "[Instrumentation] Failed to initialize application:",
        error,
      );
      // Don't exit immediately - let Next.js handle startup failures
      // The application will fail gracefully when trying to use services
    }
  }
}
