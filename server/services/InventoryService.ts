import {
  productRepository,
  inventoryTransactionRepository,
} from "../repositories";
import type {
  Product,
  InventoryTransaction,
  InsertInventoryTransaction,
} from "../../shared/schema";

export class InventoryService {
  /**
   * INVARIANT: Stock can never go negative
   * Record stock in transaction and update product quantity
   */
  async recordStockIn(
    productId: string,
    quantity: number,
    referenceType: "purchase" | "adjustment" | "return",
    referenceId: string | null,
    notes: string | null,
    orgId: string
  ): Promise<{
    product: Product | null;
    transaction: InventoryTransaction;
  }> {
    if (quantity <= 0) {
      throw new Error("Stock in quantity must be positive");
    }

    // Update product stock
    const product = await productRepository.updateStock(
      productId,
      orgId,
      quantity
    );

    // Record transaction
    const transaction = await inventoryTransactionRepository.create(
      {
        product_id: productId,
        transaction_type: "in",
        quantity,
        reference_type: referenceType,
        reference_id: referenceId,
        notes,
      } as InsertInventoryTransaction,
      orgId
    );

    return { product, transaction };
  }

  /**
   * INVARIANT: Stock can never go negative
   * Record stock out transaction
   */
  async recordStockOut(
    productId: string,
    quantity: number,
    referenceType: "sale" | "damage" | "adjustment" | "expired",
    referenceId: string | null,
    notes: string | null,
    orgId: string
  ): Promise<{
    product: Product | null;
    transaction: InventoryTransaction;
  }> {
    if (quantity <= 0) {
      throw new Error("Stock out quantity must be positive");
    }

    // Verify sufficient stock exists
    const product = await productRepository.findById(productId, orgId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const currentStock = product.quantity_in_stock || 0;
    if (quantity > currentStock) {
      throw new Error(
        `Insufficient stock for product ${productId}. Available: ${currentStock}, Requested: ${quantity}`
      );
    }

    // Update product stock (decrease)
    const updatedProduct = await productRepository.updateStock(
      productId,
      orgId,
      -quantity
    );

    // Record transaction
    const transaction = await inventoryTransactionRepository.create(
      {
        product_id: productId,
        transaction_type: "out",
        quantity,
        reference_type: referenceType,
        reference_id: referenceId,
        notes,
      } as InsertInventoryTransaction,
      orgId
    );

    return { product: updatedProduct, transaction };
  }

  /**
   * Adjust stock (can be positive or negative)
   * INVARIANT: Final stock cannot be negative
   */
  async adjustStock(
    productId: string,
    delta: number,
    reason: string,
    orgId: string
  ): Promise<{
    product: Product | null;
    transaction: InventoryTransaction;
  }> {
    if (delta === 0) {
      throw new Error("Adjustment delta cannot be zero");
    }

    // Verify product and stock
    const product = await productRepository.findById(productId, orgId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const currentStock = product.quantity_in_stock || 0;
    const newStock = currentStock + delta;

    if (newStock < 0) {
      throw new Error(
        `Adjustment would result in negative stock. Current: ${currentStock}, Delta: ${delta}`
      );
    }

    // Update stock
    const updatedProduct = await productRepository.updateStock(
      productId,
      orgId,
      delta
    );

    // Record transaction
    const transaction = await inventoryTransactionRepository.create(
      {
        product_id: productId,
        transaction_type: "adjustment",
        quantity: Math.abs(delta),
        reference_type: "adjustment",
        reference_id: null,
        notes: reason,
      } as InsertInventoryTransaction,
      orgId
    );

    return { product: updatedProduct, transaction };
  }

  /**
   * Get current stock level
   */
  async getStock(productId: string, orgId: string): Promise<number> {
    const product = await productRepository.findById(productId, orgId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    return product.quantity_in_stock || 0;
  }

  /**
   * Check if stock is below minimum threshold
   */
  async isLowStock(productId: string, orgId: string): Promise<boolean> {
    const product = await productRepository.findById(productId, orgId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const currentStock = product.quantity_in_stock || 0;
    const minStock = product.min_stock_level || 5;

    return currentStock < minStock;
  }

  /**
   * Get all low stock products
   */
  async getLowStockProducts(orgId: string): Promise<Product[]> {
    return productRepository.findLowStock(orgId);
  }

  /**
   * Get all products expiring soon
   */
  async getNearExpiryProducts(
    orgId: string,
    daysUntilExpiry: number = 7
  ): Promise<Product[]> {
    return productRepository.findNearExpiry(orgId, daysUntilExpiry);
  }

  /**
   * Get inventory movement summary for a product
   */
  async getMovementSummary(
    productId: string,
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    productId: string;
    totalIn: number;
    totalOut: number;
    adjustments: number;
    netChange: number;
  }> {
    const summary = await inventoryTransactionRepository.getMovementSummary(
      productId,
      orgId,
      startDate,
      endDate
    );

    return {
      productId,
      totalIn: summary.totalIn,
      totalOut: summary.totalOut,
      adjustments: summary.adjustments,
      netChange: summary.totalIn - summary.totalOut + summary.adjustments,
    };
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(orgId: string): Promise<{
    totalProducts: number;
    lowStockCount: number;
    nearExpiryCount: number;
    totalValue: number;
  }> {
    const stats = await productRepository.getStats(orgId);
    return {
      totalProducts: stats.total,
      lowStockCount: stats.lowStock,
      nearExpiryCount: stats.nearExpiry,
      totalValue: stats.totalValue,
    };
  }
}

// Export singleton
export const inventoryService = new InventoryService();
