import Redis from "ioredis";
import { env } from "@/lib/env";

export interface SessionData {
  cookie: {
    originalMaxAge: number;
    expires: string;
    secure: boolean;
    httpOnly: boolean;
  };
  csrfSecret: string;
  validationToken?: string;
  userId?: string;
}

export interface DocumentHead {
  files: Record<string, { stringLength?: number; byteLength?: number }>;
  projectVersion: string;
  v2DocVersions: Record<string, { pathname: string; v: number }>;
}

export class RedisManager {
  private client: Redis | null = null;
  private static instance: RedisManager;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (this.client) {
      return; // Already connected
    }

    try {
      this.client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Read-only mode for safety
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await this.client.connect();

      this.client.on("error", (error) => {
        console.error("Redis connection error:", error);
      });

      this.client.on("reconnecting", () => {
        console.log("Redis reconnecting...");
      });

      console.log("Connected to Redis successfully");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log("Disconnected from Redis");
    }
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<Redis> {
    if (!this.client) {
      await this.connect();
    }
    return this.client!;
  }

  // Session management

  /**
   * Get session data by session ID
   */
  public async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const client = await this.ensureConnection();
      const sessionKey = `sess:${sessionId}`;
      const sessionData = await client.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as SessionData;
    } catch (error) {
      console.error("Error getting session:", error);
      throw error;
    }
  }

  /**
   * List all active sessions
   */
  public async getActiveSessions(): Promise<
    { sessionId: string; data: SessionData }[]
  > {
    try {
      const client = await this.ensureConnection();
      const sessionKeys = await client.keys("sess:*");

      const sessions = await Promise.all(
        sessionKeys.map(async (key) => {
          const sessionId = key.replace("sess:", "");
          const data = await this.getSession(sessionId);
          return data ? { sessionId, data } : null;
        }),
      );

      return sessions.filter(
        (session): session is { sessionId: string; data: SessionData } =>
          session !== null,
      );
    } catch (error) {
      console.error("Error getting active sessions:", error);
      throw error;
    }
  }

  /**
   * Get sessions by user ID
   */
  public async getUserSessions(
    userId: string,
  ): Promise<{ sessionId: string; data: SessionData }[]> {
    try {
      const allSessions = await this.getActiveSessions();
      return allSessions.filter((session) => session.data.userId === userId);
    } catch (error) {
      console.error("Error getting user sessions:", error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(): Promise<{
    totalSessions: number;
    authenticatedSessions: number;
    expiredSessions: number;
  }> {
    try {
      const sessions = await this.getActiveSessions();
      const now = new Date();

      const stats = sessions.reduce(
        (acc, session) => {
          acc.totalSessions++;

          if (session.data.userId) {
            acc.authenticatedSessions++;
          }

          if (new Date(session.data.cookie.expires) < now) {
            acc.expiredSessions++;
          }

          return acc;
        },
        { totalSessions: 0, authenticatedSessions: 0, expiredSessions: 0 },
      );

      return stats;
    } catch (error) {
      console.error("Error getting session stats:", error);
      throw error;
    }
  }

  // Document collaboration cache

  /**
   * Get document head information
   */
  public async getDocumentHead(
    projectId: string,
  ): Promise<DocumentHead | null> {
    try {
      const client = await this.ensureConnection();
      const headKey = `head:${projectId}`;
      const headData = await client.get(headKey);

      if (!headData) {
        return null;
      }

      return JSON.parse(headData) as DocumentHead;
    } catch (error) {
      console.error("Error getting document head:", error);
      throw error;
    }
  }

  /**
   * Get document version
   */
  public async getDocumentVersion(projectId: string): Promise<number | null> {
    try {
      const client = await this.ensureConnection();
      const versionKey = `head-version:${projectId}`;
      const version = await client.get(versionKey);

      return version ? parseInt(version, 10) : null;
    } catch (error) {
      console.error("Error getting document version:", error);
      throw error;
    }
  }

  /**
   * Get document changes count
   */
  public async getDocumentChangesCount(projectId: string): Promise<number> {
    try {
      const client = await this.ensureConnection();
      const changesKey = `changes:${projectId}`;
      return await client.llen(changesKey);
    } catch (error) {
      console.error("Error getting document changes count:", error);
      return 0;
    }
  }

  /**
   * Get recent document changes
   */
  public async getRecentDocumentChanges(
    projectId: string,
    count = 10,
  ): Promise<any[]> {
    try {
      const client = await this.ensureConnection();
      const changesKey = `changes:${projectId}`;
      const changes = await client.lrange(changesKey, -count, -1);

      return changes.map((change) => {
        try {
          return JSON.parse(change);
        } catch {
          return change;
        }
      });
    } catch (error) {
      console.error("Error getting recent document changes:", error);
      return [];
    }
  }

  /**
   * Get persisted version info
   */
  public async getPersistedVersionInfo(projectId: string): Promise<{
    version: number | null;
    time: string | null;
    expireTime: string | null;
  }> {
    try {
      const client = await this.ensureConnection();

      const [version, time, expireTime] = await Promise.all([
        client.get(`persisted-version:${projectId}`),
        client.get(`persist-time:${projectId}`),
        client.get(`expire-time:${projectId}`),
      ]);

      return {
        version: version ? parseInt(version, 10) : null,
        time,
        expireTime,
      };
    } catch (error) {
      console.error("Error getting persisted version info:", error);
      return { version: null, time: null, expireTime: null };
    }
  }

  // Cache management

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    totalKeys: number;
    sessionKeys: number;
    documentKeys: number;
    memoryUsage: number;
    connectedClients: number;
  }> {
    try {
      const client = await this.ensureConnection();

      const [info, sessionKeys, headKeys, changesKeys] = await Promise.all([
        client.info("memory"),
        client.keys("sess:*"),
        client.keys("head:*"),
        client.keys("changes:*"),
      ]);

      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      const clientsMatch = info.match(/connected_clients:(\d+)/);
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1], 10) : 0;

      const documentKeys = headKeys.length + changesKeys.length;

      return {
        totalKeys: sessionKeys.length + documentKeys,
        sessionKeys: sessionKeys.length,
        documentKeys,
        memoryUsage,
        connectedClients,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      throw error;
    }
  }

  /**
   * Clear expired sessions
   */
  public async clearExpiredSessions(): Promise<number> {
    try {
      const client = await this.ensureConnection();
      const sessionKeys = await client.keys("sess:*");
      let clearedCount = 0;

      for (const key of sessionKeys) {
        const ttl = await client.ttl(key);
        if (ttl === -1) {
          // No expiration set
          continue;
        }

        const sessionData = await client.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as SessionData;
          const now = new Date();
          const expires = new Date(session.cookie.expires);

          if (expires < now) {
            await client.del(key);
            clearedCount++;
          }
        }
      }

      return clearedCount;
    } catch (error) {
      console.error("Error clearing expired sessions:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> {
    try {
      const client = await this.ensureConnection();
      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        latency: -1,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get all keys matching pattern
   */
  public async getKeysPattern(pattern: string): Promise<string[]> {
    try {
      const client = await this.ensureConnection();
      return await client.keys(pattern);
    } catch (error) {
      console.error("Error getting keys by pattern:", error);
      return [];
    }
  }

  /**
   * Get value by key
   */
  public async getValue(key: string): Promise<string | null> {
    try {
      const client = await this.ensureConnection();
      return await client.get(key);
    } catch (error) {
      console.error("Error getting value:", error);
      return null;
    }
  }

  /**
   * Get TTL for a key
   */
  public async getTTL(key: string): Promise<number> {
    try {
      const client = await this.ensureConnection();
      return await client.ttl(key);
    } catch (error) {
      console.error("Error getting TTL:", error);
      return -1;
    }
  }
}
