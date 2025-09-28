import { vi } from "vitest";
import type { SessionData } from "@/server/managers/redis";

export const mockSessionData: SessionData = {
  cookie: {
    originalMaxAge: 432000000,
    expires: new Date(Date.now() + 432000000).toISOString(),
    secure: false,
    httpOnly: true,
  },
  csrfSecret: "csrf-secret",
  validationToken: "validation-token",
  userId: "user123",
};

export const mockRedisManager = {
  getInstance: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  getSession: vi.fn(),
  getActiveSessions: vi.fn(),
  getUserSessions: vi.fn(),
  getSessionStats: vi.fn(),
  getDocumentHead: vi.fn(),
  getDocumentVersion: vi.fn(),
  getDocumentChangesCount: vi.fn(),
  getRecentDocumentChanges: vi.fn(),
  getPersistedVersionInfo: vi.fn(),
  getCacheStats: vi.fn(),
  clearExpiredSessions: vi.fn(),
  healthCheck: vi.fn(),
  getKeysPattern: vi.fn(),
  getValue: vi.fn(),
  getTTL: vi.fn(),
};
