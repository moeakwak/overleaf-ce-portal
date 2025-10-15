import type { Collection } from "mongodb";
import type { OverleafDoc, OverleafProject } from "../../types/overleaf";
import { BaseOverleafRepository } from "./base.repository";

/**
 * Repository for Overleaf project data access.
 *
 * Provides atomic, composable query methods for project data.
 * Business logic (filter building, data enrichment) belongs in the Service layer.
 */
export class OverleafProjectRepository extends BaseOverleafRepository {
  /**
   * Get the projects collection
   */
  private getProjectsCollection(): Collection<OverleafProject> {
    return this.getMongoDB().collection<OverleafProject>("projects");
  }

  /**
   * Get the documents collection
   */
  private getDocsCollection(): Collection<OverleafDoc> {
    return this.getMongoDB().collection<OverleafDoc>("docs");
  }

  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<OverleafProject | null> {
    const collection = this.getProjectsCollection();
    return await collection.findOne({ _id: id });
  }

  /**
   * Find multiple projects by IDs
   */
  async findByIds(ids: string[]): Promise<OverleafProject[]> {
    const collection = this.getProjectsCollection();
    return await collection.find({ _id: { $in: ids } }).toArray();
  }

  /**
   * Find projects by owner
   */
  async findByOwner(ownerId: string): Promise<OverleafProject[]> {
    const collection = this.getProjectsCollection();
    return await collection.find({ owner_ref: ownerId }).toArray();
  }

  /**
   * Find many projects with filter and options
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
  ): Promise<OverleafProject[]> {
    const collection = this.getProjectsCollection();
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
    const collection = this.getProjectsCollection();
    return await collection.countDocuments(filter);
  }

  /**
   * Count projects updated after a certain date
   */
  async countProjectsUpdatedAfter(sinceDate: Date): Promise<number> {
    return await this.count({
      lastUpdated: { $gte: sinceDate },
    });
  }

  // Document operations

  /**
   * Find documents by project ID
   */
  async findDocsByProject(projectId: string): Promise<OverleafDoc[]> {
    const collection = this.getDocsCollection();
    return await collection.find({ project_id: projectId }).toArray();
  }

  /**
   * Find a document by ID
   */
  async findDocById(id: string): Promise<OverleafDoc | null> {
    const collection = this.getDocsCollection();
    return await collection.findOne({ _id: id });
  }
}
