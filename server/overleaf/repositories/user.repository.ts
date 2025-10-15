import type { Collection } from "mongodb";
import type { OverleafUser } from "../../types/overleaf";
import { BaseOverleafRepository } from "./base.repository";

/**
 * Repository for Overleaf user data access.
 *
 * Provides atomic, composable query methods for user data.
 * Business logic (filter building, pagination calculation) belongs in the Service layer.
 */
export class OverleafUserRepository extends BaseOverleafRepository {
  /**
   * Get the users collection
   */
  private getUsersCollection(): Collection<OverleafUser> {
    return this.getMongoDB().collection<OverleafUser>("users");
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<OverleafUser | null> {
    const collection = this.getUsersCollection();
    return await collection.findOne({ email });
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<OverleafUser | null> {
    const collection = this.getUsersCollection();
    return await collection.findOne({ _id: id });
  }

  /**
   * Find multiple users by IDs
   */
  async findByIds(ids: string[]): Promise<OverleafUser[]> {
    const collection = this.getUsersCollection();
    return await collection.find({ _id: { $in: ids } }).toArray();
  }

  /**
   * Find many users with filter and options
   *
   * @param filter - MongoDB filter object (built by Service layer)
   * @param options - Query options (skip, limit, sort)
   */
  async findMany(
    filter: Record<string, any>,
    options: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    } = {},
  ): Promise<OverleafUser[]> {
    const collection = this.getUsersCollection();
    let query = collection.find(filter);

    if (options.skip !== undefined) {
      query = query.skip(options.skip);
    }

    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    return await query.toArray();
  }

  /**
   * Count documents matching filter
   */
  async count(filter: Record<string, any> = {}): Promise<number> {
    const collection = this.getUsersCollection();
    return await collection.countDocuments(filter);
  }

  /**
   * Count users with admin privileges
   */
  async countAdmins(): Promise<number> {
    return await this.count({ isAdmin: true });
  }

  /**
   * Count active users (active in last N days)
   */
  async countActiveUsers(sinceDate: Date): Promise<number> {
    return await this.count({
      lastActive: { $gte: sinceDate },
    });
  }

  /**
   * Count users who signed up after a certain date
   */
  async countUsersSignedUpAfter(sinceDate: Date): Promise<number> {
    return await this.count({
      signUpDate: { $gte: sinceDate },
    });
  }
}
