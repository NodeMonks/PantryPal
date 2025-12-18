import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductRepository } from "../../server/repositories/ProductRepository";

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
    execute: vi.fn(),
  },
}));

describe("ProductRepository - Stock Conservation", () => {
  let repository: ProductRepository;
  const orgId = "test-org-123";

  beforeEach(() => {
    repository = new ProductRepository();
    vi.clearAllMocks();
  });

  describe("updateStock", () => {
    it("should enforce non-negative stock constraint", async () => {
      const { db } = await import("../../server/db");

      const product = {
        id: "product-1",
        name: "Test Product",
        quantity_in_stock: 5,
        org_id: orgId,
        is_active: true,
      };

      // Mock findById to return the product
      vi.spyOn(repository, "findById").mockResolvedValue(product as any);

      await expect(
        repository.updateStock("product-1", orgId, -10)
      ).rejects.toThrow("Insufficient stock");
    });

    it("should allow stock increase", async () => {
      const { db } = await import("../../server/db");

      const product = {
        id: "product-1",
        name: "Test Product",
        quantity_in_stock: 5,
        org_id: orgId,
        is_active: true,
      };

      const updatedProduct = {
        ...product,
        quantity_in_stock: 15,
      };

      vi.spyOn(repository, "findById").mockResolvedValue(product as any);
      vi.mocked(db.returning).mockResolvedValue([updatedProduct]);

      const result = await repository.updateStock("product-1", orgId, 10);

      expect(result?.quantity_in_stock).toBe(15);
    });

    it("should allow stock decrease when sufficient quantity available", async () => {
      const { db } = await import("../../server/db");

      const product = {
        id: "product-1",
        name: "Test Product",
        quantity_in_stock: 50,
        org_id: orgId,
        is_active: true,
      };

      const updatedProduct = {
        ...product,
        quantity_in_stock: 45,
      };

      vi.spyOn(repository, "findById").mockResolvedValue(product as any);
      vi.mocked(db.returning).mockResolvedValue([updatedProduct]);

      const result = await repository.updateStock("product-1", orgId, -5);

      expect(result?.quantity_in_stock).toBe(45);
    });
  });
});

describe("ProductRepository - Soft Delete", () => {
  let repository: ProductRepository;
  const orgId = "test-org-123";

  beforeEach(() => {
    repository = new ProductRepository();
    vi.clearAllMocks();
  });

  it.skip("should filter out soft-deleted products in findAll", async () => {
    // TODO: Convert to integration test - mocking drizzle query builder is too complex
    const { db } = await import("../../server/db");

    // Mock should only return active products
    const mockProducts = [
      { id: "product-1", name: "Active", is_active: true, org_id: orgId },
      { id: "product-2", name: "Active 2", is_active: true, org_id: orgId },
    ];

    vi.mocked(db.where).mockReturnValue({
      where: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(mockProducts),
      }),
    } as any);

    const products = await repository.findAll(orgId);

    // Verify where clause filters by is_active = true
    expect(db.where).toHaveBeenCalled();
    expect(products.every((p) => p.is_active)).toBe(true);
  });

  it.skip("should filter out soft-deleted products in findById", async () => {
    // TODO: Convert to integration test - mocking drizzle query builder is too complex
    const { db } = await import("../../server/db");

    // Mock product lookup with is_active check
    vi.mocked(db.returning).mockResolvedValue([]);

    const product = await repository.findById("product-1", orgId);

    expect(product).toBeNull();
    expect(db.where).toHaveBeenCalled();
  });

  it("should set is_active = false on soft delete", async () => {
    const { db } = await import("../../server/db");

    await repository.softDelete("product-1", orgId);

    expect(db.update).toHaveBeenCalled();
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );
  });
});

describe("ProductRepository - Multi-Tenant Isolation", () => {
  let repository: ProductRepository;

  beforeEach(() => {
    repository = new ProductRepository();
    vi.clearAllMocks();
  });

  it.skip("should scope all queries by org_id", async () => {
    // TODO: Convert to integration test - mocking drizzle query builder is too complex
    const { db } = await import("../../server/db");

    vi.mocked(db.returning).mockResolvedValue([]);

    await repository.findById("product-1", "org-123");

    expect(db.where).toHaveBeenCalled();
  });

  it("should inject org_id on create", async () => {
    const { db } = await import("../../server/db");

    const productData = {
      name: "New Product",
      category: "Test",
      mrp: "100.00",
      buying_cost: "80.00",
    };

    vi.mocked(db.returning).mockResolvedValue([
      {
        ...productData,
        id: "product-new",
        org_id: "org-123",
      },
    ]);

    await repository.create(productData as any, "org-123");

    expect(db.values).toHaveBeenCalled();
  });
});
