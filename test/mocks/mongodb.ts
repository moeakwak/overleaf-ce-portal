import { vi } from "vitest";
import type { OverleafUser, OverleafProject } from "@/server/types/overleaf";

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

export const mockMongoManager = {
  getInstance: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  listUsers: vi.fn(),
  getUserStats: vi.fn(),
  findProjectsByOwner: vi.fn(),
  findProjectById: vi.fn(),
  listProjects: vi.fn(),
  getProjectStats: vi.fn(),
  findDocsByProject: vi.fn(),
  findDocById: vi.fn(),
  healthCheck: vi.fn(),
  getDatabaseStats: vi.fn(),
};
