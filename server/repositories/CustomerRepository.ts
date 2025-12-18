import { db } from "../db";
import {
  customers,
  type Customer,
  type InsertCustomer,
} from "../../shared/schema";
import { eq, and, or } from "drizzle-orm";
import type { IRepository } from "./IRepository";

/**
 * CustomerRepository - Data access layer for customers
 * Enforces org_id scoping
 */
export class CustomerRepository implements IRepository<Customer> {
  /**
   * Find a customer by ID within an organization
   */
  async findById(id: string, orgId: string): Promise<Customer | null> {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all customers for an organization
   */
  async findAll(
    orgId: string,
    filters?: Record<string, any>
  ): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.org_id, orgId));
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string, orgId: string): Promise<Customer | null> {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.email, email), eq(customers.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find customer by phone
   */
  async findByPhone(phone: string, orgId: string): Promise<Customer | null> {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.phone, phone), eq(customers.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Create a new customer
   */
  async create(data: InsertCustomer, orgId: string): Promise<Customer> {
    const result = await db
      .insert(customers)
      .values({
        ...data,
        org_id: orgId as any,
      })
      .returning();
    return result[0];
  }

  /**
   * Update a customer
   */
  async update(
    id: string,
    data: Partial<Customer>,
    orgId: string
  ): Promise<Customer | null> {
    const result = await db
      .update(customers)
      .set(data)
      .where(and(eq(customers.id, id), eq(customers.org_id, orgId)))
      .returning();
    return result[0] || null;
  }

  /**
   * Soft delete (mark inactive) - Not typically used for customers
   * Included for interface compliance
   */
  async softDelete(id: string, orgId: string): Promise<boolean> {
    // Customers don't have is_active flag, so we just archive
    // Could add is_archived flag if needed
    return true;
  }

  /**
   * Delete a customer (hard delete)
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.org_id, orgId)));
    return true;
  }
}

// Export singleton instance
export const customerRepository = new CustomerRepository();
