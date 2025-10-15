import { type Collection, type Db, MongoClient } from "mongodb";
import { env } from "@/lib/env";
import type {
  OverleafDoc,
  OverleafProject,
  OverleafUser,
  ProjectListOptions,
  UserListOptions,
} from "../types/overleaf";

export class MongoDBManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private static instance: MongoDBManager;

  private constructor() {}

  public static getInstance(): MongoDBManager {
    if (!MongoDBManager.instance) {
      MongoDBManager.instance = new MongoDBManager();
    }
    return MongoDBManager.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.client && this.db) {
      return; // Already connected
    }

    try {
      this.client = new MongoClient(env.MONGODB_URL, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        // Read-only mode for safety
        readPreference: "secondaryPreferred",
        // Direct connection to bypass replica set discovery
        directConnection: true,
      });

      await this.client.connect();
      this.db = this.client.db("sharelatex");

      console.log("Connected to MongoDB successfully");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("Disconnected from MongoDB");
    }
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<Db> {
    if (!this.db) {
      await this.connect();
    }
    return this.db!;
  }

  /**
   * Get users collection
   */
  private async getUsersCollection(): Promise<Collection<OverleafUser>> {
    const db = await this.ensureConnection();
    return db.collection<OverleafUser>("users");
  }

  /**
   * Get projects collection
   */
  private async getProjectsCollection(): Promise<Collection<OverleafProject>> {
    const db = await this.ensureConnection();
    return db.collection<OverleafProject>("projects");
  }

  /**
   * Get documents collection
   */
  private async getDocsCollection(): Promise<Collection<OverleafDoc>> {
    const db = await this.ensureConnection();
    return db.collection<OverleafDoc>("docs");
  }

  // User operations

  /**
   * Find user by email
   */
  public async findUserByEmail(email: string): Promise<OverleafUser | null> {
    try {
      const collection = await this.getUsersCollection();
      return await collection.findOne({ email });
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  public async findUserById(id: string): Promise<OverleafUser | null> {
    try {
      const collection = await this.getUsersCollection();
      return await collection.findOne({ _id: id });
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  /**
   * List users with pagination and filtering
   */
  public async listUsers(options: UserListOptions = {}): Promise<{
    users: OverleafUser[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const collection = await this.getUsersCollection();
      const { limit = 50, offset = 0, emailFilter, adminOnly } = options;

      // Build filter
      const filter: any = {};
      if (emailFilter) {
        filter.email = { $regex: emailFilter, $options: "i" };
      }
      if (adminOnly) {
        filter.isAdmin = true;
      }

      const [users, total] = await Promise.all([
        collection
          .find(filter)
          .skip(offset)
          .limit(limit)
          .sort({ signUpDate: -1 })
          .toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        users,
        total,
        hasMore: offset + users.length < total,
      };
    } catch (error) {
      console.error("Error listing users:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(): Promise<{
    totalUsers: number;
    adminUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  }> {
    try {
      const collection = await this.getUsersCollection();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalUsers, adminUsers, activeUsers, newUsersThisMonth] =
        await Promise.all([
          collection.countDocuments({}),
          collection.countDocuments({ isAdmin: true }),
          collection.countDocuments({
            lastActive: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          }),
          collection.countDocuments({
            signUpDate: { $gte: monthStart },
          }),
        ]);

      return {
        totalUsers,
        adminUsers,
        activeUsers,
        newUsersThisMonth,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw error;
    }
  }

  // Project operations

  /**
   * Find projects by owner
   */
  public async findProjectsByOwner(
    ownerId: string,
  ): Promise<OverleafProject[]> {
    try {
      const collection = await this.getProjectsCollection();
      return await collection.find({ owner_ref: ownerId }).toArray();
    } catch (error) {
      console.error("Error finding projects by owner:", error);
      throw error;
    }
  }

  /**
   * Find project by ID
   */
  public async findProjectById(id: string): Promise<OverleafProject | null> {
    try {
      const collection = await this.getProjectsCollection();
      return await collection.findOne({ _id: id });
    } catch (error) {
      console.error("Error finding project by ID:", error);
      throw error;
    }
  }

  /**
   * List projects with pagination and filtering
   */
  public async listProjects(options: ProjectListOptions = {}): Promise<{
    projects: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const collection = await this.getProjectsCollection();
      const usersCollection = await this.getUsersCollection();
      const { limit = 50, offset = 0, ownerId, nameFilter } = options;

      // Build filter
      const filter: any = {};
      if (ownerId) {
        filter.owner_ref = ownerId;
      }
      if (nameFilter) {
        filter.name = { $regex: nameFilter, $options: "i" };
      }

      const [projects, total] = await Promise.all([
        collection
          .find(filter)
          .skip(offset)
          .limit(limit)
          .sort({ lastUpdated: -1 })
          .toArray(),
        collection.countDocuments(filter),
      ]);

      // Enrich projects with user information
      const enrichedProjects = await Promise.all(
        projects.map(async (project) => {
          const enrichedProject: any = { ...project };

          // Get owner user info
          if (project.owner_ref) {
            const ownerUser = await usersCollection.findOne({
              _id: project.owner_ref,
            });
            if (ownerUser) {
              enrichedProject.ownerUser = {
                _id: ownerUser._id,
                email: ownerUser.email,
                first_name: ownerUser.first_name,
                last_name: ownerUser.last_name,
                lastLoggedIn: ownerUser.lastLoggedIn,
              };
            }
          }

          // Get collaborator user info
          const collaboratorUsers = [];
          if (
            project.collaberator_refs &&
            project.collaberator_refs.length > 0
          ) {
            const collabUsers = await usersCollection
              .find({
                _id: { $in: project.collaberator_refs },
              })
              .toArray();

            for (const user of collabUsers) {
              collaboratorUsers.push({
                _id: user._id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                lastLoggedIn: user.lastLoggedIn,
                type: "read-write" as const,
              });
            }
          }

          if (project.readOnly_refs && project.readOnly_refs.length > 0) {
            const readOnlyUsers = await usersCollection
              .find({
                _id: { $in: project.readOnly_refs },
              })
              .toArray();

            for (const user of readOnlyUsers) {
              collaboratorUsers.push({
                _id: user._id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                lastLoggedIn: user.lastLoggedIn,
                type: "read-only" as const,
              });
            }
          }

          if (collaboratorUsers.length > 0) {
            enrichedProject.collaboratorUsers = collaboratorUsers;
          }

          return enrichedProject;
        }),
      );

      return {
        projects: enrichedProjects,
        total,
        hasMore: offset + projects.length < total,
      };
    } catch (error) {
      console.error("Error listing projects:", error);
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  public async getProjectStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    projectsThisMonth: number;
    averageProjectsPerUser: number;
  }> {
    try {
      const projectsCollection = await this.getProjectsCollection();
      const usersCollection = await this.getUsersCollection();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalProjects, activeProjects, projectsThisMonth, totalUsers] =
        await Promise.all([
          projectsCollection.countDocuments({}),
          projectsCollection.countDocuments({
            lastUpdated: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          }),
          projectsCollection.countDocuments({
            lastUpdated: { $gte: monthStart },
          }),
          usersCollection.countDocuments({}),
        ]);

      return {
        totalProjects,
        activeProjects,
        projectsThisMonth,
        averageProjectsPerUser:
          totalUsers > 0
            ? Math.round((totalProjects / totalUsers) * 100) / 100
            : 0,
      };
    } catch (error) {
      console.error("Error getting project stats:", error);
      throw error;
    }
  }

  // Document operations

  /**
   * Find documents by project ID
   */
  public async findDocsByProject(projectId: string): Promise<OverleafDoc[]> {
    try {
      const collection = await this.getDocsCollection();
      return await collection.find({ project_id: projectId }).toArray();
    } catch (error) {
      console.error("Error finding docs by project:", error);
      throw error;
    }
  }

  /**
   * Find document by ID
   */
  public async findDocById(id: string): Promise<OverleafDoc | null> {
    try {
      const collection = await this.getDocsCollection();
      return await collection.findOne({ _id: id });
    } catch (error) {
      console.error("Error finding doc by ID:", error);
      throw error;
    }
  }

  // Health check operations

  /**
   * Check database connection health
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    collections: string[];
    error?: string;
  }> {
    try {
      const db = await this.ensureConnection();
      const collections = await db.listCollections().toArray();

      return {
        connected: true,
        collections: collections.map((c) => c.name),
      };
    } catch (error) {
      return {
        connected: false,
        collections: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<{
    dbSize: number;
    collections: { name: string; count: number }[];
    indexes: number;
  }> {
    try {
      const db = await this.ensureConnection();
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();

      const collectionStats = await Promise.all(
        collections.map(async (col) => ({
          name: col.name,
          count: await db.collection(col.name).countDocuments({}),
        })),
      );

      return {
        dbSize: stats.dataSize,
        collections: collectionStats,
        indexes: stats.indexes,
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      throw error;
    }
  }
}
