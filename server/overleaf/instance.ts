import Docker from "dockerode";
import type { Redis } from "ioredis";
import IORedis from "ioredis";
import { type Db, MongoClient } from "mongodb";
import { env } from "@/lib/env";
import { DockerCommandExecutor } from "../connectors/docker-executor";

/**
 * Configuration for an Overleaf instance connection
 */
export interface OverleafInstanceConfig {
  /** Unique identifier for this instance (for future multi-workspace support) */
  id: string;
  /** MongoDB connection URL */
  mongoUrl: string;
  /** Redis connection URL */
  redisUrl: string;
  /** Docker container name */
  containerName: string;
  /** Docker socket path */
  dockerSocketPath: string;
}

/**
 * Health status for an Overleaf instance
 */
export interface InstanceHealthStatus {
  mongodb: {
    connected: boolean;
    error?: string;
  };
  redis: {
    connected: boolean;
    latency: number;
    error?: string;
  };
  docker: {
    containerRunning: boolean;
    state: string;
    error?: string;
  };
}

/**
 * Encapsulates all connections and resources for a single Overleaf instance.
 *
 * This class manages MongoDB (read-only), Redis (cache), and Docker (script execution)
 * connections for an Overleaf CE instance. It provides a clean abstraction layer
 * that supports future multi-workspace scenarios.
 *
 * Key responsibilities:
 * - Connection lifecycle management (connect/disconnect)
 * - Resource access through controlled getters
 * - Health checking and monitoring
 *
 * Usage:
 * ```typescript
 * const instance = new OverleafInstance(config);
 * await instance.connect();
 * const db = instance.getMongoDB();
 * // ... use the instance
 * await instance.disconnect();
 * ```
 */
export class OverleafInstance {
  private mongoClient: MongoClient | null = null;
  private mongoDB: Db | null = null;
  private redisClient: Redis | null = null;
  private docker: Docker | null = null;
  private dockerExecutor: DockerCommandExecutor | null = null;

  constructor(private readonly config: OverleafInstanceConfig) {}

  /**
   * Connect to all external services (MongoDB, Redis, Docker)
   */
  public async connect(): Promise<void> {
    await Promise.all([
      this.connectMongo(),
      this.connectRedis(),
      this.initDocker(),
    ]);
  }

  /**
   * Disconnect from all external services
   */
  public async disconnect(): Promise<void> {
    await Promise.all([
      this.disconnectMongo(),
      this.disconnectRedis(),
      // Docker client doesn't need explicit cleanup
    ]);
  }

  /**
   * Get MongoDB database instance
   * @throws Error if not connected
   */
  public getMongoDB(): Db {
    if (!this.mongoDB) {
      throw new Error(
        `MongoDB not connected for instance ${this.config.id}. Call connect() first.`,
      );
    }
    return this.mongoDB;
  }

  /**
   * Get Redis client instance
   * @throws Error if not connected
   */
  public getRedis(): Redis {
    if (!this.redisClient) {
      throw new Error(
        `Redis not connected for instance ${this.config.id}. Call connect() first.`,
      );
    }
    return this.redisClient;
  }

  /**
   * Get Docker client instance
   * @throws Error if not initialized
   */
  public getDocker(): Docker {
    if (!this.docker) {
      throw new Error(
        `Docker not initialized for instance ${this.config.id}. Call connect() first.`,
      );
    }
    return this.docker;
  }

  /**
   * Get Docker command executor instance
   * @throws Error if not initialized
   */
  public getDockerExecutor(): DockerCommandExecutor {
    if (!this.dockerExecutor) {
      throw new Error(
        `Docker executor not initialized for instance ${this.config.id}. Call connect() first.`,
      );
    }
    return this.dockerExecutor;
  }

  /**
   * Get the container name for this instance
   */
  public getContainerName(): string {
    return this.config.containerName;
  }

  /**
   * Get the instance ID
   */
  public getId(): string {
    return this.config.id;
  }

  /**
   * Perform a health check on all connected services
   */
  public async healthCheck(): Promise<InstanceHealthStatus> {
    const [mongoHealth, redisHealth, dockerHealth] = await Promise.all([
      this.checkMongoHealth(),
      this.checkRedisHealth(),
      this.checkDockerHealth(),
    ]);

    return {
      mongodb: mongoHealth,
      redis: redisHealth,
      docker: dockerHealth,
    };
  }

  // Private connection methods

  private async connectMongo(): Promise<void> {
    try {
      this.mongoClient = new MongoClient(this.config.mongoUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        // Read-only mode for safety
        readPreference: "secondaryPreferred",
        // Direct connection to bypass replica set discovery
        directConnection: true,
      });

      await this.mongoClient.connect();
      this.mongoDB = this.mongoClient.db("sharelatex");

      console.log(
        `[OverleafInstance:${this.config.id}] Connected to MongoDB successfully`,
      );
    } catch (error) {
      console.error(
        `[OverleafInstance:${this.config.id}] Failed to connect to MongoDB:`,
        error,
      );
      throw error;
    }
  }

  private async disconnectMongo(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
      this.mongoDB = null;
      console.log(
        `[OverleafInstance:${this.config.id}] Disconnected from MongoDB`,
      );
    }
  }

  private async connectRedis(): Promise<void> {
    try {
      this.redisClient = new IORedis(this.config.redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await this.redisClient.connect();

      this.redisClient.on("error", (error) => {
        console.error(
          `[OverleafInstance:${this.config.id}] Redis connection error:`,
          error,
        );
      });

      this.redisClient.on("reconnecting", () => {
        console.log(
          `[OverleafInstance:${this.config.id}] Redis reconnecting...`,
        );
      });

      console.log(
        `[OverleafInstance:${this.config.id}] Connected to Redis successfully`,
      );
    } catch (error) {
      console.error(
        `[OverleafInstance:${this.config.id}] Failed to connect to Redis:`,
        error,
      );
      throw error;
    }
  }

  private async disconnectRedis(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
      console.log(
        `[OverleafInstance:${this.config.id}] Disconnected from Redis`,
      );
    }
  }

  private async initDocker(): Promise<void> {
    try {
      this.docker = new Docker({
        socketPath: this.config.dockerSocketPath,
      });

      // Create the DockerCommandExecutor with the Docker instance
      this.dockerExecutor = new DockerCommandExecutor(
        this.docker,
        this.config.containerName,
      );

      console.log(
        `[OverleafInstance:${this.config.id}] Initialized Docker client and executor`,
      );
    } catch (error) {
      console.error(
        `[OverleafInstance:${this.config.id}] Failed to initialize Docker:`,
        error,
      );
      throw error;
    }
  }

  // Health check methods

  private async checkMongoHealth(): Promise<{
    connected: boolean;
    error?: string;
  }> {
    try {
      if (!this.mongoDB) {
        return { connected: false, error: "Not connected" };
      }

      await this.mongoDB.command({ ping: 1 });
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async checkRedisHealth(): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> {
    try {
      if (!this.redisClient) {
        return { connected: false, latency: -1, error: "Not connected" };
      }

      const start = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - start;

      return { connected: true, latency };
    } catch (error) {
      return {
        connected: false,
        latency: -1,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async checkDockerHealth(): Promise<{
    containerRunning: boolean;
    state: string;
    error?: string;
  }> {
    try {
      if (!this.docker) {
        return {
          containerRunning: false,
          state: "not_initialized",
          error: "Docker not initialized",
        };
      }

      const container = this.docker.getContainer(this.config.containerName);
      const info = await container.inspect();

      return {
        containerRunning: info.State.Running,
        state: info.State.Status,
      };
    } catch (error) {
      return {
        containerRunning: false,
        state: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Factory function to create an OverleafInstance from environment variables
 * This is the standard way to create the default instance
 */
export function createDefaultOverleafInstance(): OverleafInstance {
  return new OverleafInstance({
    id: "default",
    mongoUrl: env.MONGODB_URL,
    redisUrl: env.REDIS_URL,
    containerName: env.SHARELATEX_CONTAINER,
    dockerSocketPath: env.DOCKER_SOCKET_PATH,
  });
}
