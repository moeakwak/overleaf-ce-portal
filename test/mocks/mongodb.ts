import { vi } from "vitest";
import type { OverleafProject, OverleafUser } from "@/server/types/overleaf";

export const mockUser: OverleafUser = {
  _id: "user123",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  isAdmin: false,
  features: {
    collaborators: -1,
    versioning: true,
    dropbox: true,
    github: true,
    gitBridge: true,
    compileTimeout: 180,
    compileGroup: "standard",
    references: true,
    trackChanges: true,
  },
  emails: [
    {
      email: "test@example.com",
      createdAt: new Date(),
      _id: "email123",
    },
  ],
  signUpDate: new Date(),
  lastLoggedIn: new Date(),
  lastActive: new Date(),
  loginCount: 5,
};

export const mockProject: OverleafProject = {
  _id: "project123",
  name: "Test Project",
  owner_ref: "user123",
  collaberator_refs: [],
  readOnly_refs: [],
  publicAccesLevel: "tokenBased",
  compiler: "xelatex",
  spellCheckLanguage: "en",
  tokens: {
    readAndWrite: "rw-token",
    readOnly: "ro-token",
  },
  rootFolder: [],
  rootDoc_id: "doc123",
  lastUpdated: new Date(),
  version: 1,
};

export const createMockUserRepository = () => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByIds: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  countAdmins: vi.fn(),
  countActiveUsers: vi.fn(),
  countUsersSignedUpAfter: vi.fn(),
});

export const createMockProjectRepository = () => ({
  findById: vi.fn(),
  findByIds: vi.fn(),
  findByOwner: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  countProjectsUpdatedAfter: vi.fn(),
  findDocsByProject: vi.fn(),
  findDocById: vi.fn(),
});

export const createMockSessionRepository = () => ({
  getSession: vi.fn(),
  getAllSessions: vi.fn(),
  getUserSessions: vi.fn(),
  deleteSessions: vi.fn(),
  getSessionTTL: vi.fn(),
  getDocumentHead: vi.fn(),
  getDocumentVersion: vi.fn(),
  getDocumentChangesCount: vi.fn(),
  getRecentDocumentChanges: vi.fn(),
  getPersistedVersionInfo: vi.fn(),
  getCacheStats: vi.fn(),
  ping: vi.fn(),
});
