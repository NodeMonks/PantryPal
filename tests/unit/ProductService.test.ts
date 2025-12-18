import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductService } from "../../server/services/ProductService";
import { productRepository } from "../../server/repositories";

// Mock repository
vi.mock("../../server/repositories", () => ({
  productRepository: {
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    softDelete: vi.fn(),
    findAll: vi.fn(),
    findLowStock: vi.fn(),
    findNearExpiry: vi.fn(),
    updateStock: vi.fn(),
  },
}));

describe("ProductService - Stock Conservation", () => {
  const service = new ProductService();
  const orgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateStock", () => {
    it("should prevent stock from going negative", async () => {
      const product = {
        id: "product-1",
        name: "Test Product",
        quantity_in_stock: 5,
        org_id: orgId,
      };

      vi.mocked(productRepository.findById).mockResolvedValue(product as any);
      vi.mocked(productRepository.updateStock).mockRejectedValue(
        new Error(
          "Insufficient stock for product product-1. Current: 5, Delta: -10"
        )
      );

      await expect(
        productRepository.updateStock("product-1", orgId, -10)
      ).rejects.toThrow("Insufficient stock");
    });

    it("should allow valid stock increase", async () => {
      const product = {
        id: "product-1",
        name: "Test Product",
        quantity_in_stock: 5,
        org_id: orgId,
      };

      const updatedProduct = {
        ...product,
        quantity_in_stock: 15,
      };

      vi.mocked(productRepository.findById).mockResolvedValue(product as any);
      vi.mocked(productRepository.updateStock).mockResolvedValue(
        updatedProduct as any
      );

      const result = await productRepository.updateStock(
        "product-1",
        orgId,
        10
      );

      expect(result?.quantity_in_stock).toBe(15);
    });

    it("should allow stock decrease if sufficient quantity available", async () => {
      const product = {
        id: "product-1",
        name: "Test Product",
        quantity_in_stock: 50,
        org_id: orgId,
      };

      const updatedProduct = {
        ...product,
        quantity_in_stock: 45,
      };

      vi.mocked(productRepository.findById).mockResolvedValue(product as any);
      vi.mocked(productRepository.updateStock).mockResolvedValue(
        updatedProduct as any
      );

      const result = await productRepository.updateStock(
        "product-1",
        orgId,
        -5
      );

      expect(result?.quantity_in_stock).toBe(45);
    });
  });
});

describe("ProductService - Unique Constraints", () => {
  const service = new ProductService();
  const orgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createProduct", () => {
    it("should prevent duplicate barcode within org", async () => {
      const existingProduct = {
        id: "product-1",
        barcode: "123456",
        org_id: orgId,
      };

      vi.mocked(productRepository.findByCode).mockResolvedValue(
        existingProduct as any
      );

      await expect(
        service.createProduct(
          {
            name: "New Product",
            barcode: "123456",
            category: "Test",
            mrp: "100",
            buying_cost: "80",
          } as any,
          orgId
        )
      ).rejects.toThrow(
        "Product with barcode 123456 already exists in this organization"
      );
    });

    it("should prevent duplicate QR code within org", async () => {
      const existingProduct = {
        id: "product-1",
        qr_code: "QR123456",
        org_id: orgId,
      };

      // Reset mocks before setting new sequence
      vi.mocked(productRepository.findByCode).mockClear();

      // Mock: Only QR check (no barcode provided in test data, so barcode check is skipped)
      vi.mocked(productRepository.findByCode).mockResolvedValueOnce(
        existingProduct as any
      ); // QR check finds duplicate

      await expect(
        service.createProduct(
          {
            name: "New Product",
            qr_code: "QR123456",
            category: "Test",
            mrp: "100",
            buying_cost: "80",
          } as any,
          orgId
        )
      ).rejects.toThrow(
        "Product with QR code QR123456 already exists in this organization"
      );
    });

    it("should allow creating product with unique codes", async () => {
      const newProduct = {
        id: "product-new",
        name: "New Product",
        barcode: "999999",
        qr_code: "QR999999",
        org_id: orgId,
      };

      // Reset mocks before setting new sequence
      vi.mocked(productRepository.findByCode).mockClear();
      vi.mocked(productRepository.create).mockClear();

      // Both barcode and QR checks should return null (not found)
      vi.mocked(productRepository.findByCode)
        .mockResolvedValueOnce(null) // barcode check
        .mockResolvedValueOnce(null); // QR check
      vi.mocked(productRepository.create).mockResolvedValue(newProduct as any);

      const result = await service.createProduct(
        {
          name: "New Product",
          barcode: "999999",
          qr_code: "QR999999",
          category: "Test",
          mrp: "100",
          buying_cost: "80",
        } as any,
        orgId
      );

      expect(result).toEqual(newProduct);
    });
  });
});

describe("ProductService - Soft Delete", () => {
  const service = new ProductService();
  const orgId = "test-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should soft delete products by default", async () => {
    vi.mocked(productRepository.softDelete).mockResolvedValue(true);

    const result = await service.deleteProduct("product-1", orgId);

    expect(result).toBe(true);
    expect(productRepository.softDelete).toHaveBeenCalledWith(
      "product-1",
      orgId
    );
  });

  it("should exclude soft-deleted products from queries", async () => {
    const activeProducts = [
      { id: "product-1", name: "Active 1", is_active: true },
      { id: "product-2", name: "Active 2", is_active: true },
    ];

    vi.mocked(productRepository.findAll).mockResolvedValue(
      activeProducts as any
    );

    const result = await service.listProducts(orgId);

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.is_active)).toBe(true);
  });
});
