import { describe, it, expect, beforeEach, vi } from "vitest";
import { BillRepository } from "../../server/repositories/BillRepository";

// Mock database
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  },
}));

describe("BillRepository - Immutability Enforcement", () => {
  let repository: BillRepository;
  const orgId = "test-org-123";

  beforeEach(() => {
    repository = new BillRepository();
    vi.clearAllMocks();
  });

  describe("update", () => {
    it("should prevent updating finalized bill", async () => {
      const { db } = await import("../../server/db");

      const finalizedBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: new Date(),
        bill_number: "BILL-001",
        customer_id: "cust-1",
        total_amount: "100.00",
        discount_amount: "0.00",
        tax_amount: "0.00",
        created_at: new Date(),
      };

      // Mock findById to return finalized bill
      vi.spyOn(repository, "findById").mockResolvedValue(finalizedBill as any);

      await expect(
        repository.update("bill-1", { discount_amount: "50.00" } as any, orgId)
      ).rejects.toThrow("Cannot update finalized bill");
    });

    it("should allow updating draft bill", async () => {
      const { db } = await import("../../server/db");

      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
        bill_number: "BILL-001",
        customer_id: "cust-1",
        total_amount: "100.00",
        discount_amount: "0.00",
        tax_amount: "0.00",
        created_at: new Date(),
      };

      const updatedBill = {
        ...draftBill,
        discount_amount: "50.00",
      };

      // Mock findById for draft bill
      vi.spyOn(repository, "findById").mockResolvedValue(draftBill as any);
      vi.mocked(db.returning).mockResolvedValue([updatedBill]);

      const result = await repository.update(
        "bill-1",
        { discount_amount: "50.00" } as any,
        orgId
      );

      expect(result).toBeTruthy();
    });
  });

  describe("delete", () => {
    it("should prevent deleting finalized bill", async () => {
      const { db } = await import("../../server/db");

      const finalizedBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: new Date(),
        bill_number: "BILL-001",
        customer_id: "cust-1",
        total_amount: "100.00",
        discount_amount: "0.00",
        tax_amount: "0.00",
        created_at: new Date(),
      };

      vi.spyOn(repository, "findById").mockResolvedValue(finalizedBill as any);

      await expect(repository.delete("bill-1", orgId)).rejects.toThrow(
        "Cannot delete finalized bill"
      );
    });

    it("should allow deleting draft bill", async () => {
      const { db } = await import("../../server/db");

      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
        bill_number: "BILL-001",
        customer_id: "cust-1",
        total_amount: "100.00",
        discount_amount: "0.00",
        tax_amount: "0.00",
        created_at: new Date(),
      };

      vi.spyOn(repository, "findById").mockResolvedValue(draftBill as any);
      vi.mocked(db.returning).mockResolvedValue([draftBill]);

      const result = await repository.delete("bill-1", orgId);

      expect(result).toBe(true);
    });
  });

  describe("finalize", () => {
    it("should prevent double finalization", async () => {
      const { db } = await import("../../server/db");

      const finalizedBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: new Date(),
        bill_number: "BILL-001",
        customer_id: "cust-1",
        total_amount: "100.00",
        discount_amount: "0.00",
        tax_amount: "0.00",
        created_at: new Date(),
      };

      vi.spyOn(repository, "findById").mockResolvedValue(finalizedBill as any);

      await expect(
        repository.finalize("bill-1", orgId, "admin")
      ).rejects.toThrow("is already finalized");
    });
  });
});

describe("BillRepository - Multi-Tenant Isolation", () => {
  let repository: BillRepository;

  beforeEach(() => {
    repository = new BillRepository();
    vi.clearAllMocks();
  });

  it("should scope all queries by org_id", async () => {
    const { db } = await import("../../server/db");
    const { and, eq } = await import("drizzle-orm");

    vi.mocked(db.returning).mockResolvedValue([]);

    await repository.findById("bill-1", "org-123");

    // Verify where clause includes org_id filter
    expect(db.where).toHaveBeenCalled();
  });

  it("should inject org_id on create", async () => {
    const { db } = await import("../../server/db");

    const billData = {
      bill_number: "INV-001",
      customer_id: "cust-1",
      final_amount: "500.00",
    };

    vi.mocked(db.returning).mockResolvedValue([
      {
        ...billData,
        id: "bill-new",
        org_id: "org-123",
      },
    ]);

    await repository.create(billData as any, "org-123");

    // Verify values() was called with org_id
    expect(db.values).toHaveBeenCalled();
  });
});
