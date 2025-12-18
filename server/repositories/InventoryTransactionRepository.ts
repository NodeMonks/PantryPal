import { db } from "../db";
import {
  inventory_transactions,
  type InventoryTransaction,
  type InsertInventoryTransaction,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { IRepository } from "./IRepository";

/**
 * InventoryTransactionRepository - Data access layer for stock movement history
 * Enforces org_id scoping
 */
export class InventoryTransactionRepository
  implements IRepository<InventoryTransaction>
{
  /**
   * Find a transaction by ID within an organization
   */
  async findById(
    id: string,
    orgId: string
  ): Promise<InventoryTransaction | null> {
    const result = await db
      .select()
      .from(inventory_transactions)
      .where(
        and(
          eq(inventory_transactions.id, id),
          eq(inventory_transactions.org_id, orgId)
        )
      )
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all transactions for an organization
   */
  async findAll(
    orgId: string,
    filters?: Record<string, any>
  ): Promise<InventoryTransaction[]> {
    return db
      .select()
      .from(inventory_transactions)
      .where(eq(inventory_transactions.org_id, orgId))
      .orderBy(desc(inventory_transactions.created_at));
  }

  /**
   * Find all transactions for a specific product
   */
  async findByProductId(
    productId: string,
    orgId: string
  ): Promise<InventoryTransaction[]> {
    return db
      .select()
      .from(inventory_transactions)
      .where(
        and(
          eq(inventory_transactions.product_id, productId),
          eq(inventory_transactions.org_id, orgId)
        )
      )
      .orderBy(desc(inventory_transactions.created_at));
  }

  /**
   * Create a new transaction record
   */
  async create(
    data: InsertInventoryTransaction,
    orgId: string
  ): Promise<InventoryTransaction> {
    const result = await db
      .insert(inventory_transactions)
      .values({
        ...data,
        org_id: orgId as any,
      })
      .returning();
    return result[0];
  }

  /**
   * Update a transaction (generally not recommended for audit trail)
   */
  async update(
    id: string,
    data: Partial<InventoryTransaction>,
    orgId: string
  ): Promise<InventoryTransaction | null> {
    const result = await db
      .update(inventory_transactions)
      .set(data)
      .where(
        and(
          eq(inventory_transactions.id, id),
          eq(inventory_transactions.org_id, orgId)
        )
      )
      .returning();
    return result[0] || null;
  }

  /**
   * Soft delete - Not applicable for audit transactions
   */
  async softDelete(id: string, orgId: string): Promise<boolean> {
    return true;
  }

  /**
   * Delete a transaction (use with caution - breaks audit trail)
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    await db
      .delete(inventory_transactions)
      .where(
        and(
          eq(inventory_transactions.id, id),
          eq(inventory_transactions.org_id, orgId)
        )
      );
    return true;
  }

  /**
   * Get inventory movement summary for a product within date range
   */
  async getMovementSummary(
    productId: string,
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalIn: number;
    totalOut: number;
    adjustments: number;
  }> {
    const result = await (db as any).execute(
      `SELECT 
        SUM(CASE WHEN transaction_type = 'in' THEN quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN transaction_type = 'out' THEN quantity ELSE 0 END) as total_out,
        SUM(CASE WHEN transaction_type = 'adjustment' THEN quantity ELSE 0 END) as adjustments
      FROM inventory_transactions
      WHERE product_id = $1 
        AND org_id = $2 
        AND created_at BETWEEN $3 AND $4`,
      productId,
      orgId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    const row = (result as any[])[0];
    return {
      totalIn: parseInt(row.total_in) || 0,
      totalOut: parseInt(row.total_out) || 0,
      adjustments: parseInt(row.adjustments) || 0,
    };
  }
}

// Export singleton instance
export const inventoryTransactionRepository =
  new InventoryTransactionRepository();
