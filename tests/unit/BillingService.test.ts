import { describe, it, expect, beforeEach, vi } from "vitest";
import { BillingService } from "../../server/services/BillingService";
import {
  billRepository,
  billItemRepository,
  creditNoteRepository,
  productRepository,
} from "../../server/repositories";

// Mock repositories
vi.mock("../../server/repositories", () => ({
  billRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    finalize: vi.fn(),
  },
  billItemRepository: {
    create: vi.fn(),
    findByBillId: vi.fn(),
    delete: vi.fn(),
  },
  creditNoteRepository: {
    create: vi.fn(),
    getTotalCreditForBill: vi.fn(),
  },
  productRepository: {
    findById: vi.fn(),
    updateStock: vi.fn(),
  },
}));

vi.mock("../../server/db", () => ({
  db: {
    transaction: vi.fn((callback) => callback({})),
  },
}));

describe("BillingService - Bill Immutability", () => {
  const service = new BillingService();
  const orgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addBillItem", () => {
    it("should prevent adding items to finalized bill", async () => {
      const finalizedBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: new Date(),
        bill_number: "INV-001",
      };

      vi.mocked(billRepository.findById).mockResolvedValue(
        finalizedBill as any
      );

      await expect(
        service.addBillItem("bill-1", "product-1", 5, orgId)
      ).rejects.toThrow(
        "Cannot add items to finalized bill bill-1. Finalized bills are immutable."
      );
    });

    it("should allow adding items to draft bill", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
        bill_number: "INV-001",
      };

      const product = {
        id: "product-1",
        name: "Test Product",
        mrp: "100.00",
        quantity_in_stock: 50,
        org_id: orgId,
      };

      const billItem = {
        id: "item-1",
        bill_id: "bill-1",
        product_id: "product-1",
        quantity: 5,
        unit_price: "100.00",
        total_price: "500.00",
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(productRepository.findById).mockResolvedValue(product as any);
      vi.mocked(billItemRepository.create).mockResolvedValue(billItem as any);

      const result = await service.addBillItem("bill-1", "product-1", 5, orgId);

      expect(result).toEqual(billItem);
      expect(billItemRepository.create).toHaveBeenCalled();
    });
  });

  describe("removeBillItem", () => {
    it("should prevent removing items from finalized bill", async () => {
      const finalizedBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: new Date(),
        bill_number: "INV-001",
      };

      vi.mocked(billRepository.findById).mockResolvedValue(
        finalizedBill as any
      );

      await expect(
        service.removeBillItem("item-1", "bill-1", orgId)
      ).rejects.toThrow(
        "Cannot remove items from finalized bill bill-1. Use credit notes for corrections."
      );
    });

    it("should allow removing items from draft bill", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
        bill_number: "INV-001",
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(billItemRepository.delete).mockResolvedValue(true);

      const result = await service.removeBillItem("item-1", "bill-1", orgId);

      expect(result).toBe(true);
      expect(billItemRepository.delete).toHaveBeenCalledWith("item-1", orgId);
    });
  });
});

describe("BillingService - Stock Conservation", () => {
  const service = new BillingService();
  const orgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addBillItem - Stock Validation", () => {
    it("should reject adding item with insufficient stock", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
      };

      const product = {
        id: "product-1",
        name: "Low Stock Product",
        mrp: "100.00",
        quantity_in_stock: 3,
        org_id: orgId,
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(productRepository.findById).mockResolvedValue(product as any);

      await expect(
        service.addBillItem("bill-1", "product-1", 5, orgId)
      ).rejects.toThrow(
        'Insufficient stock for product "Low Stock Product". Available: 3, Requested: 5'
      );
    });

    it("should reject adding item with zero or negative quantity", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
      };

      const product = {
        id: "product-1",
        name: "Test Product",
        mrp: "100.00",
        quantity_in_stock: 50,
        org_id: orgId,
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(productRepository.findById).mockResolvedValue(product as any);

      await expect(
        service.addBillItem("bill-1", "product-1", 0, orgId)
      ).rejects.toThrow("Quantity must be positive");

      await expect(
        service.addBillItem("bill-1", "product-1", -5, orgId)
      ).rejects.toThrow("Quantity must be positive");
    });

    it("should allow adding item with sufficient stock", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
      };

      const product = {
        id: "product-1",
        name: "Test Product",
        mrp: "100.00",
        quantity_in_stock: 50,
        org_id: orgId,
      };

      const billItem = {
        id: "item-1",
        bill_id: "bill-1",
        product_id: "product-1",
        quantity: 5,
        unit_price: "100.00",
        total_price: "500.00",
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(productRepository.findById).mockResolvedValue(product as any);
      vi.mocked(billItemRepository.create).mockResolvedValue(billItem as any);

      const result = await service.addBillItem("bill-1", "product-1", 5, orgId);

      expect(result).toEqual(billItem);
    });
  });

  describe("finalizeBill - Atomic Stock Updates", () => {
    it("should validate all items have sufficient stock before finalizing", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
        bill_number: "INV-001",
      };

      const items = [
        {
          id: "item-1",
          bill_id: "bill-1",
          product_id: "product-1",
          quantity: 10,
        },
      ];

      const product = {
        id: "product-1",
        name: "Low Stock Product",
        quantity_in_stock: 5, // Not enough!
        org_id: orgId,
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(billItemRepository.findByBillId).mockResolvedValue(
        items as any
      );
      vi.mocked(productRepository.findById).mockResolvedValue(product as any);

      await expect(
        service.finalizeBill("bill-1", orgId, "admin")
      ).rejects.toThrow("Stock validation failed");
    });

    it("should prevent finalizing empty bill", async () => {
      const draftBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: null,
      };

      vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);
      vi.mocked(billItemRepository.findByBillId).mockResolvedValue([]);

      await expect(
        service.finalizeBill("bill-1", orgId, "admin")
      ).rejects.toThrow("Cannot finalize empty bill");
    });

    it("should prevent finalizing already finalized bill", async () => {
      const finalizedBill = {
        id: "bill-1",
        org_id: orgId,
        finalized_at: new Date(),
      };

      vi.mocked(billRepository.findById).mockResolvedValue(
        finalizedBill as any
      );

      await expect(
        service.finalizeBill("bill-1", orgId, "admin")
      ).rejects.toThrow("is already finalized");
    });
  });
});

describe("BillingService - Credit Notes", () => {
  const service = new BillingService();
  const orgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should only allow credit notes for finalized bills", async () => {
    const draftBill = {
      id: "bill-1",
      org_id: orgId,
      finalized_at: null,
      final_amount: "500.00",
    };

    vi.mocked(billRepository.findById).mockResolvedValue(draftBill as any);

    await expect(
      service.createCreditNote("bill-1", 100, "Product return", orgId)
    ).rejects.toThrow(
      "Bill bill-1 is not finalized. Edit it directly instead of creating a credit note."
    );
  });

  it("should prevent credit note exceeding bill amount", async () => {
    const finalizedBill = {
      id: "bill-1",
      org_id: orgId,
      finalized_at: new Date(),
      final_amount: "500.00",
    };

    vi.mocked(billRepository.findById).mockResolvedValue(finalizedBill as any);

    await expect(
      service.createCreditNote("bill-1", 600, "Excessive refund", orgId)
    ).rejects.toThrow("Credit note amount (600) exceeds bill amount (500.00)");
  });

  it("should create valid credit note for finalized bill", async () => {
    const finalizedBill = {
      id: "bill-1",
      org_id: orgId,
      finalized_at: new Date(),
      final_amount: "500.00",
    };

    const creditNote = {
      id: "credit-1",
      bill_id: "bill-1",
      amount: "100.00",
      reason: "Product return",
    };

    vi.mocked(billRepository.findById).mockResolvedValue(finalizedBill as any);
    vi.mocked(creditNoteRepository.create).mockResolvedValue(creditNote as any);

    const result = await service.createCreditNote(
      "bill-1",
      100,
      "Product return",
      orgId
    );

    expect(result).toEqual(creditNote);
    expect(creditNoteRepository.create).toHaveBeenCalled();
  });
});
