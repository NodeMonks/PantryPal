import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { storage } from "../../server/storage";
import {
  bills,
  bill_items,
  products,
  organizations,
  credit_notes,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

describe("Bill Finalization and Credit Notes", () => {
  let testOrgId: string;
  let testProductId: string;
  let testBillId: string;

  beforeAll(async () => {
    // Create test organization
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Bill Finalization Org" })
      .returning();
    testOrgId = org.id;

    // Create test product
    const [product] = await db
      .insert(products)
      .values({
        org_id: testOrgId,
        name: "Test Product",
        category: "Test",
        mrp: "100.00",
        buying_cost: "80.00",
        quantity_in_stock: 100,
        is_active: true,
      })
      .returning();
    testProductId = product.id;

    // Create test bill
    const [bill] = await db
      .insert(bills)
      .values({
        org_id: testOrgId,
        bill_number: `TEST-BILL-${Date.now()}`,
        total_amount: "100.00",
        final_amount: "100.00",
      })
      .returning();
    testBillId = bill.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (testBillId) {
      await db.delete(credit_notes).where(eq(credit_notes.bill_id, testBillId));
      await db.delete(bill_items).where(eq(bill_items.bill_id, testBillId));
      await db.delete(bills).where(eq(bills.id, testBillId));
    }
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe("Bill Finalization", () => {
    it("should allow adding items to non-finalized bills", async () => {
      const bill = await storage.getBill(testBillId, { orgId: testOrgId });
      expect(bill).toBeDefined();
      expect(bill?.finalized_at).toBeNull();

      const item = await storage.createBillItem(
        {
          bill_id: testBillId,
          product_id: testProductId,
          quantity: 2,
          unit_price: "50.00",
          total_price: "100.00",
        },
        { orgId: testOrgId }
      );

      expect(item).toBeDefined();
      expect(item.bill_id).toBe(testBillId);
    });

    it("should finalize a bill and set timestamp", async () => {
      const updated = await storage.updateBill(
        testBillId,
        {
          finalized_at: new Date(),
          finalized_by: "test-user",
        },
        { orgId: testOrgId }
      );

      expect(updated).toBeDefined();
      expect(updated?.finalized_at).toBeDefined();
      expect(updated?.finalized_by).toBe("test-user");
    });

    it("should detect finalized bills", async () => {
      const bill = await storage.getBill(testBillId, { orgId: testOrgId });
      expect(bill).toBeDefined();
      expect(bill?.finalized_at).toBeDefined();
      expect(bill?.finalized_at).toBeInstanceOf(Date);
    });

    it("should enforce tenant isolation on bill finalization", async () => {
      const wrongOrgId = "00000000-0000-0000-0000-000000000000";
      const bill = await storage.getBill(testBillId, { orgId: wrongOrgId });
      expect(bill).toBeUndefined();
    });
  });

  describe("Credit Notes", () => {
    it("should create a credit note for a finalized bill", async () => {
      const note = await storage.createCreditNote(
        {
          bill_id: testBillId,
          amount: "20.00",
          reason: "Customer return",
        },
        { orgId: testOrgId }
      );

      expect(note).toBeDefined();
      expect(note.bill_id).toBe(testBillId);
      expect(note.amount).toBe("20.00");
      expect(note.reason).toBe("Customer return");
      expect(note.org_id).toBe(testOrgId);
    });

    it("should list credit notes for a bill", async () => {
      const notes = await storage.getCreditNotes(testBillId, {
        orgId: testOrgId,
      });

      expect(notes).toBeDefined();
      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].bill_id).toBe(testBillId);
    });

    it("should create multiple credit notes", async () => {
      await storage.createCreditNote(
        {
          bill_id: testBillId,
          amount: "10.00",
          reason: "Discount adjustment",
        },
        { orgId: testOrgId }
      );

      const notes = await storage.getCreditNotes(testBillId, {
        orgId: testOrgId,
      });

      expect(notes.length).toBeGreaterThanOrEqual(2);
    });

    it("should enforce tenant isolation on credit notes", async () => {
      const wrongOrgId = "00000000-0000-0000-0000-000000000000";
      const notes = await storage.getCreditNotes(testBillId, {
        orgId: wrongOrgId,
      });

      expect(notes).toBeDefined();
      expect(notes.length).toBe(0);
    });

    it("should order credit notes by created_at descending", async () => {
      const notes = await storage.getCreditNotes(testBillId, {
        orgId: testOrgId,
      });

      if (notes.length > 1) {
        const firstDate = new Date(notes[0].created_at).getTime();
        const secondDate = new Date(notes[1].created_at).getTime();
        expect(firstDate).toBeGreaterThanOrEqual(secondDate);
      }
    });
  });

  describe("Stock Invariants", () => {
    it("should allow negative stock at DB level (enforcement in routes)", async () => {
      // Get current stock
      const product = await storage.getProduct(testProductId, {
        orgId: testOrgId,
      });
      expect(product).toBeDefined();

      const currentStock = product?.quantity_in_stock || 0;

      // Database allows negative values, but routes enforce non-negative
      const updated = await storage.updateProduct(
        testProductId,
        { quantity_in_stock: -10 },
        { orgId: testOrgId }
      );

      expect(updated).toBeDefined();
      expect(updated?.quantity_in_stock).toBe(-10);

      // Reset to positive value for other tests
      await storage.updateProduct(
        testProductId,
        { quantity_in_stock: Math.max(currentStock, 100) },
        { orgId: testOrgId }
      );
    });

    it("should maintain stock accuracy after updates", async () => {
      const initialProduct = await storage.getProduct(testProductId, {
        orgId: testOrgId,
      });
      const initialStock = initialProduct?.quantity_in_stock || 0;

      // Update stock
      const updated = await storage.updateProduct(
        testProductId,
        { quantity_in_stock: initialStock + 50 },
        { orgId: testOrgId }
      );

      expect(updated?.quantity_in_stock).toBe(initialStock + 50);

      // Verify persistence
      const refetched = await storage.getProduct(testProductId, {
        orgId: testOrgId,
      });
      expect(refetched?.quantity_in_stock).toBe(initialStock + 50);
    });
  });

  describe("Tenant Isolation", () => {
    it("should isolate products by org_id", async () => {
      const wrongOrgId = "00000000-0000-0000-0000-000000000000";
      const product = await storage.getProduct(testProductId, {
        orgId: wrongOrgId,
      });
      expect(product).toBeUndefined();
    });

    it("should isolate bills by org_id", async () => {
      const wrongOrgId = "00000000-0000-0000-0000-000000000000";
      const bills = await storage.getBills({ orgId: wrongOrgId });
      expect(bills).toBeDefined();
      expect(bills.length).toBe(0);
    });

    it("should isolate bill items by org_id through join", async () => {
      const wrongOrgId = "00000000-0000-0000-0000-000000000000";
      const items = await storage.getBillItems(testBillId, {
        orgId: wrongOrgId,
      });
      expect(items).toBeDefined();
      expect(items.length).toBe(0);
    });
  });
});
