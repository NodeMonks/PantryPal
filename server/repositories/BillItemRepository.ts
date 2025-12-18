import { db } from "../db";
import {
  bill_items,
  type BillItem,
  type InsertBillItem,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import type { IRepository } from "./IRepository";

/**
 * BillItemRepository - Data access layer for bill line items
 * Enforces org_id scoping
 */
export class BillItemRepository implements IRepository<BillItem> {
  /**
   * Find a bill item by ID within an organization
   */
  async findById(id: string, orgId: string): Promise<BillItem | null> {
    const result = await db
      .select()
      .from(bill_items)
      .where(and(eq(bill_items.id, id), eq(bill_items.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all bill items for an organization
   */
  async findAll(
    orgId: string,
    filters?: Record<string, any>
  ): Promise<BillItem[]> {
    return db.select().from(bill_items).where(eq(bill_items.org_id, orgId));
  }

  /**
   * Find all items for a specific bill
   */
  async findByBillId(billId: string, orgId: string): Promise<BillItem[]> {
    return db
      .select()
      .from(bill_items)
      .where(and(eq(bill_items.bill_id, billId), eq(bill_items.org_id, orgId)));
  }

  /**
   * Create a new bill item
   */
  async create(data: InsertBillItem, orgId: string): Promise<BillItem> {
    const result = await db
      .insert(bill_items)
      .values({
        ...data,
        org_id: orgId as any,
      })
      .returning();
    return result[0];
  }

  /**
   * Update a bill item
   */
  async update(
    id: string,
    data: Partial<BillItem>,
    orgId: string
  ): Promise<BillItem | null> {
    const result = await db
      .update(bill_items)
      .set(data)
      .where(and(eq(bill_items.id, id), eq(bill_items.org_id, orgId)))
      .returning();
    return result[0] || null;
  }

  /**
   * Soft delete - Not applicable for bill items
   */
  async softDelete(id: string, orgId: string): Promise<boolean> {
    return true;
  }

  /**
   * Delete a bill item
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    await db
      .delete(bill_items)
      .where(and(eq(bill_items.id, id), eq(bill_items.org_id, orgId)));
    return true;
  }

  /**
   * Delete all items for a bill
   */
  async deleteByBillId(billId: string, orgId: string): Promise<boolean> {
    await db
      .delete(bill_items)
      .where(and(eq(bill_items.bill_id, billId), eq(bill_items.org_id, orgId)));
    return true;
  }

  /**
   * Get total value of items for a bill
   */
  async getTotalForBill(billId: string, orgId: string): Promise<number> {
    const result = await (db as any).execute(
      `SELECT COALESCE(SUM(total_price), 0) as total
      FROM bill_items
      WHERE bill_id = $1 AND org_id = $2`,
      billId,
      orgId
    );

    return parseFloat((result as any[])[0]?.total || 0);
  }
}

// Export singleton instance
export const billItemRepository = new BillItemRepository();
