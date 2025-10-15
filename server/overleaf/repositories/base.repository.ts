import type { Redis } from "ioredis";
import type { Db } from "mongodb";
import type { OverleafInstance } from "../instance";

/**
 * Base class for all Overleaf repositories.
 *
 * Responsibilities:
 * - Provide controlled access to MongoDB and Redis through the OverleafInstance
 * - Enforce the repository pattern: data access only, no business logic
 * - Enable dependency injection for testability
 *
 * Repositories should:
 * ✅ Execute database queries (find, findOne, countDocuments, etc.)
 * ✅ Return raw database records
 * ✅ Provide composable atomic query methods
 *
 * Repositories should NOT:
 * ❌ Build filter conditions from business parameters
 * ❌ Transform or assemble data
 * ❌ Validate business rules
 * ❌ Calculate pagination logic (e.g., hasMore)
 *
 * Example:
 * ```typescript
 * class UserRepository extends BaseOverleafRepository {
 *   async findByEmail(email: string): Promise<User | null> {
 *     const collection = this.getUsersCollection();
 *     return await collection.findOne({ email });
 *   }
 *
 *   async findMany(filter: any, options: any): Promise<User[]> {
 *     const collection = this.getUsersCollection();
 *     return await collection
 *       .find(filter)
 *       .skip(options.skip)
 *       .limit(options.limit)
 *       .sort(options.sort)
 *       .toArray();
 *   }
 * }
 * ```
 */
export abstract class BaseOverleafRepository {
  constructor(protected readonly instance: OverleafInstance) {}

  /**
   * Get the MongoDB database instance
   * @protected For use by subclasses only
   */
  protected getMongoDB(): Db {
    return this.instance.getMongoDB();
  }

  /**
   * Get the Redis client instance
   * @protected For use by subclasses only
   */
  protected getRedis(): Redis {
    return this.instance.getRedis();
  }

  /**
   * Get the Overleaf instance
   * @protected For use by subclasses that need additional instance methods
   */
  protected getInstance(): OverleafInstance {
    return this.instance;
  }
}
