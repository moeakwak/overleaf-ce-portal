import {
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { db } from "@/lib/db";
import type * as schema from "@/lib/db/schema";
import { portalUserOverleafLink, user } from "@/lib/db/schema";

type DbConnection =
  | BetterSQLite3Database<typeof schema>
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PortalUserListOptions = {
  limit?: number;
  offset?: number;
  searchTerm?: string;
  sortBy?: "createdAt" | "name" | "email" | "role";
  sortOrder?: "asc" | "desc";
};

export type PortalUserWithLinks = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  overleafLinks: PortalUserOverleafLink[];
};

export type PortalUserOverleafLink = {
  portalUserId: string;
  overleafUserId: string;
  overleafUserEmail: string | null;
};

export type UpdatePortalUserLinkInput = {
  overleafUserId: string;
  overleafUserEmail: string | null;
};

export type PortalUserStats = {
  totalUsers: number;
  superAdmins: number;
  linkedPortalUsers: number;
  totalLinks: number;
};

export type UpdatePortalUserInput = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  overleafLinks?: UpdatePortalUserLinkInput[];
};

export class PortalUserService {
  private buildFilters(searchTerm?: string): SQL | undefined {
    if (!searchTerm) return undefined;
    const trimmed = searchTerm.trim();
    if (trimmed.length === 0) return undefined;

    const pattern = `%${trimmed}%`;
    return or(like(user.email, pattern), like(user.name, pattern));
  }

  public async listPortalUsers(options: PortalUserListOptions = {}): Promise<{
    users: PortalUserWithLinks[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const {
      limit = 25,
      offset = 0,
      searchTerm,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const filters = this.buildFilters(searchTerm);

    const sortColumnMap = {
      createdAt: user.createdAt,
      name: user.name,
      email: user.email,
      role: user.role,
    } as const;

    const sortColumn = sortColumnMap[sortBy] ?? user.createdAt;
    const orderer = sortOrder === "asc" ? asc : desc;

    const baseUsersQuery = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
      })
      .from(user);

    const baseCountQuery = db.select({ value: count() }).from(user);

    const usersQuery = filters ? baseUsersQuery.where(filters) : baseUsersQuery;
    const countQuery = filters ? baseCountQuery.where(filters) : baseCountQuery;

    const [rows, totalRow] = await Promise.all([
      usersQuery.orderBy(orderer(sortColumn)).limit(limit).offset(offset),
      countQuery,
    ]);

    const total = Number(totalRow[0]?.value ?? 0);

    if (rows.length === 0) {
      return { users: [], total, limit, offset };
    }

    const portalUserIds = rows.map((row) => row.id);
    const links = await db
      .select({
        portalUserId: portalUserOverleafLink.portalUserId,
        overleafUserId: portalUserOverleafLink.overleafUserId,
        overleafUserEmail: portalUserOverleafLink.overleafUserEmail,
      })
      .from(portalUserOverleafLink)
      .where(inArray(portalUserOverleafLink.portalUserId, portalUserIds));

    const linksByPortalId = new Map<string, PortalUserOverleafLink[]>();
    for (const link of links) {
      const items = linksByPortalId.get(link.portalUserId) ?? [];
      items.push(link);
      linksByPortalId.set(link.portalUserId, items);
    }

    const usersWithLinks: PortalUserWithLinks[] = rows.map((row) => ({
      ...row,
      overleafLinks: linksByPortalId.get(row.id) ?? [],
    }));

    return {
      users: usersWithLinks,
      total,
      limit,
      offset,
    };
  }

  /**
   * Helper method to fetch portal user with links using a specific database connection
   * Can be used with either the main db connection or a transaction
   */
  private async getPortalUserByIdWithConnection(
    portalUserId: string,
    connection: DbConnection,
  ): Promise<PortalUserWithLinks | null> {
    const [portalUser] = await connection
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(eq(user.id, portalUserId))
      .limit(1);

    if (!portalUser) {
      return null;
    }

    const links = await connection
      .select({
        portalUserId: portalUserOverleafLink.portalUserId,
        overleafUserId: portalUserOverleafLink.overleafUserId,
        overleafUserEmail: portalUserOverleafLink.overleafUserEmail,
      })
      .from(portalUserOverleafLink)
      .where(eq(portalUserOverleafLink.portalUserId, portalUserId));

    return {
      ...portalUser,
      overleafLinks: links,
    };
  }

  public async getPortalUserById(
    portalUserId: string,
  ): Promise<PortalUserWithLinks | null> {
    return this.getPortalUserByIdWithConnection(portalUserId, db);
  }

  public async updatePortalUser(
    input: UpdatePortalUserInput,
  ): Promise<PortalUserWithLinks | null> {
    return await db.transaction(async (tx) => {
      if (!input.name && !input.email && !input.role && !input.overleafLinks) {
        return this.getPortalUserByIdWithConnection(input.id, tx);
      }

      const updateData: Partial<typeof user.$inferInsert> = {};

      if (typeof input.name === "string") {
        updateData.name = input.name;
      }

      if (typeof input.email === "string") {
        updateData.email = input.email;
      }

      if (typeof input.role === "string") {
        updateData.role = input.role;
      }

      if (Object.keys(updateData).length > 0) {
        await tx
          .update(user)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(user.id, input.id));
      }

      if (Array.isArray(input.overleafLinks)) {
        await tx
          .delete(portalUserOverleafLink)
          .where(eq(portalUserOverleafLink.portalUserId, input.id));

        if (input.overleafLinks.length > 0) {
          await tx.insert(portalUserOverleafLink).values(
            input.overleafLinks.map((link) => ({
              portalUserId: input.id,
              overleafUserId: link.overleafUserId,
              overleafUserEmail: link.overleafUserEmail,
            })),
          );
        }
      }

      return this.getPortalUserByIdWithConnection(input.id, tx);
    });
  }

  public async getPortalUserStats(): Promise<PortalUserStats> {
    const [totalUsersRow, superAdminsRow, linkedPortalUsersRow, totalLinksRow] =
      await Promise.all([
        db.select({ value: count() }).from(user),
        db
          .select({ value: count() })
          .from(user)
          .where(eq(user.role, "super-admin")),
        db
          .select({
            value: sql<number>`
              COUNT(DISTINCT ${portalUserOverleafLink.portalUserId})
            `,
          })
          .from(portalUserOverleafLink),
        db.select({ value: count() }).from(portalUserOverleafLink),
      ]);

    return {
      totalUsers: Number(totalUsersRow[0]?.value ?? 0),
      superAdmins: Number(superAdminsRow[0]?.value ?? 0),
      linkedPortalUsers: Number(linkedPortalUsersRow[0]?.value ?? 0),
      totalLinks: Number(totalLinksRow[0]?.value ?? 0),
    };
  }
}
