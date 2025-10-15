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
    console.log("[AppContext] Initializing application context...");

    try {
      // Create and connect the default Overleaf instance
      const defaultInstance = createDefaultOverleafInstance();
      await defaultInstance.connect();

      // Perform health check to ensure everything is working
      const health = await defaultInstance.healthCheck();
      console.log("[AppContext] Default instance health:", {
        mongodb: health.mongodb.connected,
        redis: health.redis.connected,
        docker: health.docker.containerRunning,
      });

      // Store the instance
      this.overleafInstances.set("default", defaultInstance);

      console.log("[AppContext] Application context initialized successfully");
    } catch (error) {
      console.error("[AppContext] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Cleanup and disconnect all resources
   *
   * Should be called during application shutdown (e.g., SIGTERM handler)
   */
  public async cleanup(): Promise<void> {
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

      console.log("[AppContext] Application context cleaned up successfully");
    } catch (error) {
      console.error("[AppContext] Error during cleanup:", error);
      throw error;
    }
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
