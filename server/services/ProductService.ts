import { productRepository } from "../repositories";
import type { Product, InsertProduct } from "../../shared/schema";

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(
    data: InsertProduct,
    orgId: string
  ): Promise<Product> {
    // Validate barcode uniqueness within org (optional)
    if (data.barcode) {
      const existing = await productRepository.findByCode(
        data.barcode,
        orgId,
        "barcode"
      );
      if (existing) {
        throw new Error(
          `Product with barcode ${data.barcode} already exists in this organization`
        );
      }
    }

    // Validate QR code uniqueness within org (optional)
    if (data.qr_code) {
      const existing = await productRepository.findByCode(
        data.qr_code,
        orgId,
        "qr"
      );
      if (existing) {
        throw new Error(
          `Product with QR code ${data.qr_code} already exists in this organization`
        );
      }
    }

    return productRepository.create(data, orgId);
  }

  /**
   * Update a product
   */
  async updateProduct(
    productId: string,
    data: Partial<Omit<Product, "id" | "org_id" | "created_at" | "updated_at">>,
    orgId: string
  ): Promise<Product | null> {
    // Verify product exists
    const product = await productRepository.findById(productId, orgId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Validate barcode uniqueness if changing
    if (
      data.barcode &&
      data.barcode !== product.barcode
    ) {
      const existing = await productRepository.findByCode(
        data.barcode,
        orgId,
        "barcode"
      );
      if (existing) {
        throw new Error(
          `Product with barcode ${data.barcode} already exists`
        );
      }
    }

    // Validate QR code uniqueness if changing
    if (data.qr_code && data.qr_code !== product.qr_code) {
      const existing = await productRepository.findByCode(
        data.qr_code,
        orgId,
        "qr"
      );
      if (existing) {
        throw new Error(
          `Product with QR code ${data.qr_code} already exists`
        );
      }
    }

    return productRepository.update(productId, data as Partial<Product>, orgId);
  }

  /**
   * Get a product by ID
   */
  async getProduct(productId: string, orgId: string): Promise<Product | null> {
    return productRepository.findById(productId, orgId);
  }

  /**
   * Search product by barcode or QR code
   */
  async searchByCode(
    code: string,
    orgId: string
  ): Promise<Product | null> {
    // Try barcode first
    let product = await productRepository.findByCode(code, orgId, "barcode");
    if (product) return product;

    // Try QR code
    product = await productRepository.findByCode(code, orgId, "qr");
    return product;
  }

  /**
   * List all active products for an org
   */
  async listProducts(orgId: string): Promise<Product[]> {
    return productRepository.findAll(orgId);
  }

  /**
   * Soft delete a product (mark as inactive)
   */
  async deleteProduct(productId: string, orgId: string): Promise<boolean> {
    return productRepository.softDelete(productId, orgId);
  }

  /**
   * Get products by category
   */
  async getByCategory(category: string, orgId: string): Promise<Product[]> {
    return productRepository.findAll(orgId, { category });
  }

  /**
   * Get products by brand
   */
  async getByBrand(brand: string, orgId: string): Promise<Product[]> {
    return productRepository.findAll(orgId, { brand });
  }

  /**
   * Get products expiring soon
   */
  async getExpiringProducts(
    orgId: string,
    daysUntilExpiry: number = 7
  ): Promise<Product[]> {
    return productRepository.findNearExpiry(orgId, daysUntilExpiry);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(orgId: string): Promise<Product[]> {
    return productRepository.findLowStock(orgId);
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(orgId: string): Promise<{
    total: number;
    lowStock: number;
    nearExpiry: number;
    totalValue: number;
  }> {
    return productRepository.getStats(orgId);
  }
}

// Export singleton
export const productService = new ProductService();
