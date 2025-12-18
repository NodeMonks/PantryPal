import { db } from "../db";
import { bills, type Bill, type InsertBill } from "../../shared/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import type { IRepository } from "./IRepository";

/**
 * BillRepository - Data access layer for bills
 * Enforces org_id scoping and billing invariants
 */
export class BillRepository implements IRepository<Bill> {
  /**
   * Find a bill by ID within an organization
   */
  async findById(id: string, orgId: string): Promise<Bill | null> {
    const result = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, id), eq(bills.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all bills for an organization
   */
  async findAll(orgId: string, filters?: Record<string, any>): Promise<Bill[]> {
    let query: any = db.select().from(bills).where(eq(bills.org_id, orgId));

    // Filter by finalized status
    if (filters?.finalized !== undefined) {
      if (filters.finalized) {
        query = query.where(isNull(bills.finalized_at));
      } else {
        query = query.where(isNotNull(bills.finalized_at));
      }
    }

    return query.orderBy(desc(bills.created_at));
  }

  /**
   * Find bill by bill number (unique within org)
   */
  async findByBillNumber(
    billNumber: string,
    orgId: string
  ): Promise<Bill | null> {
    const result = await db
      .select()
      .from(bills)
      .where(and(eq(bills.bill_number, billNumber), eq(bills.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all bills for a customer
   */
  async findByCustomerId(customerId: string, orgId: string): Promise<Bill[]> {
    return db
      .select()
      .from(bills)
      .where(and(eq(bills.customer_id, customerId), eq(bills.org_id, orgId)))
      .orderBy(desc(bills.created_at));
  }

  /**
   * Create a new bill (draft state)
   */
  async create(data: InsertBill, orgId: string): Promise<Bill> {
    const result = await db
      .insert(bills)
      .values({
        ...data,
        org_id: orgId as any,
      })
      .returning();
    return result[0];
  }

  /**
   * Update a bill - ONLY allowed if not finalized
   * Throws error if bill is finalized or not found
   */
  async update(id: string, data: Partial<Bill>, orgId: string): Promise<Bill> {
    // Fetch to check finalized status
    const bill = await this.findById(id, orgId);
    if (!bill) {
      throw new Error(`Bill ${id} not found`);
    }

    if (bill.finalized_at !== null) {
      throw new Error(
        `Cannot update finalized bill ${id}. Finalized bills are immutable.`
      );
    }

    const result = await db
      .update(bills)
      .set(data)
      .where(and(eq(bills.id, id), eq(bills.org_id, orgId)))
      .returning();

    if (!result[0]) {
      throw new Error(`Failed to update bill ${id}`);
    }

    return result[0];
  }

  /**
   * Finalize a bill (lock it from further edits)
   * Sets finalized_at timestamp and finalized_by user
   * Throws if not found or already finalized
   */
  async finalize(
    id: string,
    orgId: string,
    finalizedBy: string
  ): Promise<Bill> {
    // Fetch to check state
    const bill = await this.findById(id, orgId);
    if (!bill) {
      throw new Error(`Bill ${id} not found`);
    }

    if (bill.finalized_at !== null) {
      throw new Error(`Bill ${id} is already finalized.`);
    }

    const result = await db
      .update(bills)
      .set({
        finalized_at: new Date(),
        finalized_by: finalizedBy,
      })
      .where(and(eq(bills.id, id), eq(bills.org_id, orgId)))
      .returning();

    if (!result[0]) {
      throw new Error(`Failed to finalize bill ${id}`);
    }

    return result[0];
  }

  /**
   * Soft delete - Not typically used for bills (use credit notes instead)
   * Included for interface compliance
   */
  async softDelete(id: string, orgId: string): Promise<boolean> {
    return true;
  }

  /**
   * Delete a bill (hard delete) - Only for draft bills
   * Throws if bill is finalized or not found
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    const bill = await this.findById(id, orgId);
    if (!bill) {
      throw new Error(`Bill ${id} not found`);
    }

    if (bill.finalized_at !== null) {
      throw new Error(
        `Cannot delete finalized bill ${id}. Use credit notes for corrections.`
      );
    }

    const result = await db
      .delete(bills)
      .where(and(eq(bills.id, id), eq(bills.org_id, orgId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Get bill statistics for an organization
   */
  async getStats(
    orgId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalBills: number;
    totalAmount: number;
    finalizedAmount: number;
    averageBill: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(final_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN finalized_at IS NOT NULL THEN final_amount ELSE 0 END), 0) as finalized_amount,
        COALESCE(AVG(final_amount), 0) as average_bill
      FROM bills
      WHERE org_id = $1
      ${startDate && endDate ? "AND created_at BETWEEN $2 AND $3" : ""}
    `;

    const stats = await (db as any).execute(
      query,
      ...(startDate && endDate
        ? [orgId, startDate.toISOString(), endDate.toISOString()]
        : [orgId])
    );
    const row = (stats as any[])[0];

    return {
      totalBills: parseInt(row.total_bills) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      finalizedAmount: parseFloat(row.finalized_amount) || 0,
      averageBill: parseFloat(row.average_bill) || 0,
    };
  }
}

// Export singleton instance
export const billRepository = new BillRepository();
