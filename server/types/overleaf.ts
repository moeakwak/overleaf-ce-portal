import { z } from "zod";

// User-related types
export const OverleafUserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  isAdmin: z.boolean().default(false),
  features: z.object({
    collaborators: z.number().default(-1), // -1 means unlimited
    versioning: z.boolean().default(true),
    dropbox: z.boolean().default(true),
    github: z.boolean().default(true),
    gitBridge: z.boolean().default(true),
    compileTimeout: z.number().default(180),
    compileGroup: z.string().default("standard"),
    references: z.boolean().default(true),
    trackChanges: z.boolean().default(true),
  }),
  emails: z.array(
    z.object({
      email: z.string().email(),
      createdAt: z.date().optional(),
      _id: z.string().optional(),
    }),
  ),
  signUpDate: z.date().optional(),
  lastLoggedIn: z.date().optional(),
  lastActive: z.date().optional(),
  loginCount: z.number().default(0),
});

export type OverleafUser = z.infer<typeof OverleafUserSchema>;

// Project-related types
export const OverleafProjectSchema = z.object({
  _id: z.string(),
  name: z.string(),
  owner_ref: z.string(),
  collaberator_refs: z.array(z.string()).default([]),
  readOnly_refs: z.array(z.string()).default([]),
  publicAccesLevel: z.string().default("tokenBased"),
  compiler: z.string().default("xelatex"),
  spellCheckLanguage: z.string().default("en"),
  tokens: z.object({
    readAndWrite: z.string(),
    readOnly: z.string(),
  }),
  rootFolder: z.array(z.any()),
  rootDoc_id: z.string().optional(),
  lastUpdated: z.date().optional(),
  version: z.number().default(1),
});

export type OverleafProject = z.infer<typeof OverleafProjectSchema>;

// Document-related types
export const OverleafDocSchema = z.object({
  _id: z.string(),
  project_id: z.string(),
  rev: z.number(),
  lines: z.array(z.string()),
  ranges: z.record(z.string(), z.any()).default({}),
  version: z.number(),
});

export type OverleafDoc = z.infer<typeof OverleafDocSchema>;

// Command execution types
export interface ScriptExecutionOptions {
  timeout?: number;
  workingDir?: string;
  env?: Record<string, string>;
}

export interface ScriptExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// Service types
export interface UserCreationOptions {
  email: string;
  isAdmin?: boolean;
  firstName?: string;
  lastName?: string;
}

export interface ProjectExportOptions {
  userId?: string;
  projectId?: string;
  outputPath: string;
  exportAll?: boolean;
}

export interface UserListOptions {
  limit?: number;
  offset?: number;
  emailFilter?: string;
  adminOnly?: boolean;
}

export interface ProjectListOptions {
  limit?: number;
  offset?: number;
  ownerId?: string;
  nameFilter?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
