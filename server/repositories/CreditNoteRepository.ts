import { db } from "../db";
import {
  credit_notes,
  type CreditNote,
  type InsertCreditNote,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { IRepository } from "./IRepository";

/**
 * CreditNoteRepository - Data access layer for credit notes
 * Enforces org_id scoping
 */
export class CreditNoteRepository implements IRepository<CreditNote> {
  /**
   * Find a credit note by ID within an organization
   */
  async findById(id: string, orgId: string): Promise<CreditNote | null> {
    const result = await db
      .select()
      .from(credit_notes)
      .where(and(eq(credit_notes.id, id), eq(credit_notes.org_id, orgId)))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all credit notes for an organization
   */
  async findAll(
    orgId: string,
    filters?: Record<string, any>
  ): Promise<CreditNote[]> {
    return db
      .select()
      .from(credit_notes)
      .where(eq(credit_notes.org_id, orgId))
      .orderBy(desc(credit_notes.created_at));
  }

  /**
   * Find all credit notes for a specific bill
   */
  async findByBillId(billId: string, orgId: string): Promise<CreditNote[]> {
    return db
      .select()
      .from(credit_notes)
      .where(
        and(eq(credit_notes.bill_id, billId), eq(credit_notes.org_id, orgId))
      )
      .orderBy(desc(credit_notes.created_at));
  }

  /**
   * Get total credit amount for a bill
   */
  async getTotalCreditForBill(billId: string, orgId: string): Promise<number> {
    const result = await (db as any).execute(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM credit_notes
      WHERE bill_id = $1 AND org_id = $2`,
      billId,
      orgId
    );

    return parseFloat((result as any[])[0]?.total || 0);
  }

  /**
   * Create a new credit note
   */
  async create(data: InsertCreditNote, orgId: string): Promise<CreditNote> {
    const result = await db
      .insert(credit_notes)
      .values({
        ...data,
        org_id: orgId as any,
      })
      .returning();
    return result[0];
  }

  /**
   * Update a credit note
   */
  async update(
    id: string,
    data: Partial<CreditNote>,
    orgId: string
  ): Promise<CreditNote | null> {
    const result = await db
      .update(credit_notes)
      .set(data)
      .where(and(eq(credit_notes.id, id), eq(credit_notes.org_id, orgId)))
      .returning();
    return result[0] || null;
  }

  /**
   * Soft delete - Not applicable for credit notes
   */
  async softDelete(id: string, orgId: string): Promise<boolean> {
    return true;
  }

  /**
   * Delete a credit note
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    await db
      .delete(credit_notes)
      .where(and(eq(credit_notes.id, id), eq(credit_notes.org_id, orgId)));
    return true;
  }
}

// Export singleton instance
export const creditNoteRepository = new CreditNoteRepository();
