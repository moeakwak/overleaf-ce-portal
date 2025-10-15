import {
  createDefaultOverleafInstance,
  type OverleafInstance,
} from "./overleaf/instance";
import { OverleafProjectService } from "./overleaf/services/project.service";
import { OverleafSystemService } from "./overleaf/services/system.service";
import { OverleafUserService } from "./overleaf/services/user.service";
import { PortalUserService } from "./portal/services/user.service";

/**
 * Application-level context that manages all singletons and lifecycle.
 *
 * This is the central registry for:
 * - Overleaf instance connections (currently single instance, designed for future multi-workspace)
 * - Service instances (cached for reuse across requests)
 * - Application lifecycle (initialization and cleanup)
 *
 * Key design principles:
 * - Singleton pattern for application-level resources
 * - Service caching to avoid repeated instantiation
 * - Clean separation between Portal and Overleaf concerns
 * - Future-ready for multi-workspace support
 *
 * Usage:
 * ```typescript
 * // Initialize at application startup
 * await AppContext.getInstance().initialize();
 *
 * // Use in request handlers
 * const ctx = AppContext.getInstance();
 * const service = ctx.getOverleafUserService();
 *
 * // Cleanup at application shutdown
 * await AppContext.getInstance().cleanup();
 * ```
 */
export class AppContext {
  private static instance: AppContext;

  // Overleaf instances (keyed by workspace ID)
  private overleafInstances: Map<string, OverleafInstance> = new Map();

  // Service caches (lazily populated)
  private overleafServiceCache: Map<
    string,
    {
      userService: OverleafUserService;
      projectService: OverleafProjectService;
      systemService: OverleafSystemService;
    }
  > = new Map();

  private portalUserService: PortalUserService | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton AppContext instance
   */
  public static getInstance(): AppContext {
    if (!AppContext.instance) {
      AppContext.instance = new AppContext();
    }
    return AppContext.instance;
  }

  /**
   * Initialize the application context
   *
   * This method:
   * 1. Creates the default Overleaf instance from environment variables
   * 2. Connects to all external services (MongoDB, Redis, Docker)
   * 3. Validates that all connections are healthy
   *
   * Should be called once during application startup, typically in instrumentation.ts
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("[AppContext] Initialization skipped (already initialized)");
      return;
    }

    console.log("[AppContext] Initializing application context...");

    const defaultInstance = createDefaultOverleafInstance();
    let fullyConnected = false;

    try {
      await defaultInstance.connect();
      fullyConnected = true;

      const health = await defaultInstance.healthCheck();
      console.log("[AppContext] Default instance health:", {
        mongodb: health.mongodb.connected,
        redis: health.redis.connected,
        docker: health.docker.containerRunning,
      });
    } catch (error) {
      console.error(
        "[AppContext] Failed to fully connect default Overleaf instance:",
        error,
      );
    } finally {
      await this.registerOverleafInstance(defaultInstance, "default");
    }

    if (fullyConnected) {
      console.log("[AppContext] Application context initialized successfully");
    } else {
      console.warn(
        "[AppContext] Application context initialized in degraded mode (Overleaf services unavailable)",
      );
    }
  }

  /**
   * Ensure the application context has been initialized.
   *
   * This helper prevents race conditions when multiple requests attempt to
   * initialize the context concurrently by sharing a single initialization
   * promise. It also allows on-demand initialization when the instrumentation
   * hook didn't run yet.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize().finally(() => {
        this.initializationPromise = null;
      });
    }

    await this.initializationPromise;
  }

  /**
   * Cleanup and disconnect all resources
   *
   * Should be called during application shutdown (e.g., SIGTERM handler)
   */
  public async cleanup(): Promise<void> {
    if (!this.initialized) {
      console.log("[AppContext] Cleanup skipped (context not initialized)");
      return;
    }

    console.log("[AppContext] Cleaning up application context...");

    try {
      // Disconnect all Overleaf instances
      const disconnectPromises = Array.from(
        this.overleafInstances.values(),
      ).map((instance) => instance.disconnect());
      await Promise.all(disconnectPromises);

      // Clear caches
      this.overleafInstances.clear();
      this.overleafServiceCache.clear();
      this.portalUserService = null;
      this.initialized = false;

      console.log("[AppContext] Application context cleaned up successfully");
    } catch (error) {
      console.error("[AppContext] Error during cleanup:", error);
      throw error;
    }
  }

  /**
   * Register (or replace) an Overleaf instance for a workspace.
   *
   * Useful for tests (injecting mocked connections without calling initialize)
   * or advanced runtime scenarios where a custom instance needs to be provided.
   */
  public async registerOverleafInstance(
    instance: OverleafInstance,
    workspaceId = "default",
  ): Promise<void> {
    const existing = this.overleafInstances.get(workspaceId);

    if (existing && existing !== instance) {
      try {
        await existing.disconnect();
      } catch (error) {
        console.warn(
          `[AppContext] Failed to disconnect existing instance for workspace ${workspaceId}:`,
          error,
        );
      }
    }

    this.overleafInstances.set(workspaceId, instance);
    this.overleafServiceCache.delete(workspaceId);
    this.initialized = true;

    console.log(
      `[AppContext] Registered Overleaf instance for workspace: ${workspaceId}`,
    );
  }

  /**
   * Returns whether the context has been initialized.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get an Overleaf instance by workspace ID
   *
   * @param workspaceId - The workspace ID (defaults to "default")
   * @returns The Overleaf instance
   * @throws Error if the instance doesn't exist
   */
  public getOverleafInstance(workspaceId = "default"): OverleafInstance {
    const instance = this.overleafInstances.get(workspaceId);
    if (!instance) {
      throw new Error(
        `Overleaf instance not found for workspace: ${workspaceId}. ` +
          `Did you call initialize()? Available workspaces: ${Array.from(this.overleafInstances.keys()).join(", ")}`,
      );
    }
    return instance;
  }

  /**
   * Get all registered Overleaf instances
   */
  public getAllOverleafInstances(): Map<string, OverleafInstance> {
    return new Map(this.overleafInstances);
  }

  /**
   * Get (or create and cache) Overleaf services for a workspace
   *
   * This method implements lazy initialization with caching:
   * 1. First call creates and caches all services for the workspace
   * 2. Subsequent calls return the cached instances
   *
   * Services are stateless and safe to share across requests.
   */
  private getOrCreateOverleafServices(workspaceId = "default"): {
    userService: OverleafUserService;
    projectService: OverleafProjectService;
    systemService: OverleafSystemService;
  } {
    let cache = this.overleafServiceCache.get(workspaceId);
    if (!cache) {
      const instance = this.getOverleafInstance(workspaceId);
      cache = {
        userService: new OverleafUserService(instance),
        projectService: new OverleafProjectService(instance),
        systemService: new OverleafSystemService(instance),
      };
      this.overleafServiceCache.set(workspaceId, cache);
      console.log(
        `[AppContext] Created service cache for workspace: ${workspaceId}`,
      );
    }
    return cache;
  }

  /**
   * Get the Overleaf user service for a workspace
   *
   * @param workspaceId - The workspace ID (defaults to "default")
   * @returns Cached OverleafUserService instance
   */
  public getOverleafUserService(workspaceId = "default"): OverleafUserService {
    return this.getOrCreateOverleafServices(workspaceId).userService;
  }

  /**
   * Get the Overleaf project service for a workspace
   *
   * @param workspaceId - The workspace ID (defaults to "default")
   * @returns Cached OverleafProjectService instance
   */
  public getOverleafProjectService(
    workspaceId = "default",
  ): OverleafProjectService {
    return this.getOrCreateOverleafServices(workspaceId).projectService;
  }

  /**
   * Get the Overleaf system service for a workspace
   *
   * @param workspaceId - The workspace ID (defaults to "default")
   * @returns Cached OverleafSystemService instance
   */
  public getOverleafSystemService(
    workspaceId = "default",
  ): OverleafSystemService {
    return this.getOrCreateOverleafServices(workspaceId).systemService;
  }

  /**
   * Get the Portal user service
   *
   * Portal services are application-wide (not workspace-specific)
   *
   * @returns Cached PortalUserService instance
   */
  public getPortalUserService(): PortalUserService {
    if (!this.portalUserService) {
      this.portalUserService = new PortalUserService();
      console.log("[AppContext] Created PortalUserService");
    }
    return this.portalUserService;
  }

  // Future: Support for adding/removing workspaces dynamically
  // public async addWorkspace(config: OverleafInstanceConfig): Promise<void>
  // public async removeWorkspace(workspaceId: string): Promise<void>
}

/**
 * Convenience function to get the AppContext instance
 */
export function getAppContext(): AppContext {
  return AppContext.getInstance();
}
