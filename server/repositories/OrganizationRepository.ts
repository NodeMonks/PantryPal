import { db } from "../db";
import { organizations, type Organization } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * OrganizationRepository - Data access layer for organizations
 */
export class OrganizationRepository {
  /**
   * Find an organization by ID
   */
  async findById(id: string): Promise<Organization | null> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all organizations
   */
  async findAll(): Promise<Organization[]> {
    return db.select().from(organizations);
  }

  /**
   * Create a new organization
   */
  async create(name: string): Promise<Organization> {
    const result = await db.insert(organizations).values({ name }).returning();
    return result[0];
  }

  /**
   * Update an organization
   */
  async update(id: string, name: string): Promise<Organization | null> {
    const result = await db
      .update(organizations)
      .set({ name })
      .where(eq(organizations.id, id))
      .returning();
    return result[0] || null;
  }

  /**
   * Delete an organization
   */
  async delete(id: string): Promise<boolean> {
    await db.delete(organizations).where(eq(organizations.id, id));
    return true;
  }
}

// Export singleton instance
export const organizationRepository = new OrganizationRepository();
