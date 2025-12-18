import { db } from "../db";
import { users, type User, type InsertUser } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * UserRepository - Data access layer for users
 */
export class UserRepository {
  /**
   * Find a user by ID
   */
  async findById(id: number): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all active users
   */
  async findAllActive(): Promise<User[]> {
    return db.select().from(users).where(eq(users.is_active, true));
  }

  /**
   * Create a new user
   */
  async create(data: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(data)
      .returning();
    return result[0];
  }

  /**
   * Update a user
   */
  async update(id: number, data: Partial<User>): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result[0] || null;
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: number): Promise<boolean> {
    await db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(users.id, id));
    return true;
  }

  /**
   * Hard delete a user (use with caution)
   */
  async delete(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
