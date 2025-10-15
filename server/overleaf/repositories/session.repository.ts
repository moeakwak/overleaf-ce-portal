import { BaseOverleafRepository } from "./base.repository";

/**
 * Session data structure from Redis
 */
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

/**
 * Document head structure from Redis
 */
export interface DocumentHead {
  files: Record<string, { stringLength?: number; byteLength?: number }>;
  projectVersion: string;
  v2DocVersions: Record<string, { pathname: string; v: number }>;
}

/**
 * Repository for Overleaf session and cache data access.
 *
 * Provides access to Redis-stored data including:
 * - User sessions
 * - Document collaboration cache
 * - Real-time editing metadata
 */
export class OverleafSessionRepository extends BaseOverleafRepository {
  // Session operations

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const redis = this.getRedis();
    const sessionKey = `sess:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData) as SessionData;
  }

  /**
   * Get all session keys
   */
  async getAllSessionKeys(): Promise<string[]> {
    const redis = this.getRedis();
    return await redis.keys("sess:*");
  }

  /**
   * Get all active sessions
   */
  async getAllSessions(): Promise<{ sessionId: string; data: SessionData }[]> {
    const redis = this.getRedis();
    const sessionKeys = await redis.keys("sess:*");

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
  }

  /**
   * Get sessions for a specific user
   */
  async getUserSessions(
    userId: string,
  ): Promise<{ sessionId: string; data: SessionData }[]> {
    const allSessions = await this.getAllSessions();
    return allSessions.filter((session) => session.data.userId === userId);
  }

  /**
   * Get TTL for a session key
   */
  async getSessionTTL(sessionId: string): Promise<number> {
    const redis = this.getRedis();
    const sessionKey = `sess:${sessionId}`;
    return await redis.ttl(sessionKey);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<number> {
    const redis = this.getRedis();
    const sessionKey = `sess:${sessionId}`;
    return await redis.del(sessionKey);
  }

  /**
   * Delete multiple sessions
   */
  async deleteSessions(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;

    const redis = this.getRedis();
    const sessionKeys = sessionIds.map((id) => `sess:${id}`);
    return await redis.del(...sessionKeys);
  }

  // Document collaboration cache operations

  /**
   * Get document head information
   */
  async getDocumentHead(projectId: string): Promise<DocumentHead | null> {
    const redis = this.getRedis();
    const headKey = `head:${projectId}`;
    const headData = await redis.get(headKey);

    if (!headData) {
      return null;
    }

    return JSON.parse(headData) as DocumentHead;
  }

  /**
   * Get document version
   */
  async getDocumentVersion(projectId: string): Promise<number | null> {
    const redis = this.getRedis();
    const versionKey = `head-version:${projectId}`;
    const version = await redis.get(versionKey);

    return version ? Number.parseInt(version, 10) : null;
  }

  /**
   * Get document changes count
   */
  async getDocumentChangesCount(projectId: string): Promise<number> {
    const redis = this.getRedis();
    const changesKey = `changes:${projectId}`;
    return await redis.llen(changesKey);
  }

  /**
   * Get recent document changes
   */
  async getRecentDocumentChanges(
    projectId: string,
    count = 10,
  ): Promise<any[]> {
    const redis = this.getRedis();
    const changesKey = `changes:${projectId}`;
    const changes = await redis.lrange(changesKey, -count, -1);

    return changes.map((change) => {
      try {
        return JSON.parse(change);
      } catch {
        return change;
      }
    });
  }

  /**
   * Get persisted version info
   */
  async getPersistedVersionInfo(projectId: string): Promise<{
    version: number | null;
    time: string | null;
    expireTime: string | null;
  }> {
    const redis = this.getRedis();

    const [version, time, expireTime] = await Promise.all([
      redis.get(`persisted-version:${projectId}`),
      redis.get(`persist-time:${projectId}`),
      redis.get(`expire-time:${projectId}`),
    ]);

    return {
      version: version ? Number.parseInt(version, 10) : null,
      time,
      expireTime,
    };
  }

  // Cache statistics operations

  /**
   * Get all keys matching a pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    const redis = this.getRedis();
    return await redis.keys(pattern);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    sessionKeys: number;
    documentKeys: number;
    memoryUsage: number;
    connectedClients: number;
  }> {
    const redis = this.getRedis();

    const [info, sessionKeys, headKeys, changesKeys] = await Promise.all([
      redis.info("memory"),
      redis.keys("sess:*"),
      redis.keys("head:*"),
      redis.keys("changes:*"),
    ]);

    const memoryMatch = info.match(/used_memory:(\d+)/);
    const memoryUsage = memoryMatch ? Number.parseInt(memoryMatch[1], 10) : 0;

    const clientsMatch = info.match(/connected_clients:(\d+)/);
    const connectedClients = clientsMatch
      ? Number.parseInt(clientsMatch[1], 10)
      : 0;

    const documentKeys = headKeys.length + changesKeys.length;

    return {
      totalKeys: sessionKeys.length + documentKeys,
      sessionKeys: sessionKeys.length,
      documentKeys,
      memoryUsage,
      connectedClients,
    };
  }

  /**
   * Ping Redis to check latency
   */
  async ping(): Promise<number> {
    const redis = this.getRedis();
    const start = Date.now();
    await redis.ping();
    return Date.now() - start;
  }
}
