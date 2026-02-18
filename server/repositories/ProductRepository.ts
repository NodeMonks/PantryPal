import { db } from "../db";
import {
  products,
  type Product,
  type InsertProduct,
} from "../../shared/schema";
import { eq, and, or, lt, lte, gt, isNotNull, sql } from "drizzle-orm";
import type { IRepository } from "./IRepository";

/**
 * ProductRepository - Data access layer for products
 * Enforces org_id scoping and soft-delete pattern
 */
export class ProductRepository implements IRepository<Product> {
  /**
   * Find a product by ID within an organization
   * Only returns active products
   */
  async findById(id: string, orgId: string): Promise<Product | null> {
    const result = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.org_id, orgId),
          eq(products.is_active, true),
        ),
      )
      .limit(1);
    return result[0] || null;
  }

  /**
   * Find all active products for an organization
   */
  async findAll(
    orgId: string,
    filters?: Record<string, any>,
  ): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(and(eq(products.org_id, orgId), eq(products.is_active, true)));
  }

  /**
   * Find products by barcode or QR code (for scanning)
   */
  async findByCode(
    code: string,
    orgId: string,
    type: "barcode" | "qr" = "barcode",
  ): Promise<Product | null> {
    const field = type === "barcode" ? products.barcode : products.qr_code;
    const fieldName = type === "barcode" ? "barcode" : "qr_code";

    console.log(
      `    📋 Query: SELECT WHERE ${fieldName} = "${code}" AND org_id = ${orgId}`,
    );

    const result = await db
      .select()
      .from(products)
      .where(
        and(
          eq(field, code),
          eq(products.org_id, orgId),
          eq(products.is_active, true),
        ),
      )
      .limit(1);

    console.log(`    📊 Query result: ${result.length} rows`);
    if (result[0]) {
      console.log(
        `    📌 Found: id=${result[0].id}, ${fieldName}=${
          result[0][fieldName as keyof (typeof result)[0]]
        }`,
      );
    }

    return result[0] || null;
  }

  /**
   * Find products with low stock (below min_stock_level)
   */
  async findLowStock(orgId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.org_id, orgId),
          eq(products.is_active, true),
          sql`${products.quantity_in_stock} < ${products.min_stock_level}`,
        ),
      )
      .orderBy(products.quantity_in_stock);
  }

  /**
   * Find products near expiry (within 7 days)
   */
  async findNearExpiry(
    orgId: string,
    daysUntilExpiry: number = 7,
  ): Promise<Product[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntilExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.org_id, orgId),
          eq(products.is_active, true),
          isNotNull(products.expiry_date),
          lte(products.expiry_date, futureDate.toISOString().split("T")[0]),
          gt(products.expiry_date, today.toISOString().split("T")[0]),
        ),
      )
      .orderBy(products.expiry_date);
  }

  /**
   * Create a new product (org_id required)
   */
  async create(data: InsertProduct, orgId: string): Promise<Product> {
    const result = await db
      .insert(products)
      .values({
        ...data,
        org_id: orgId as any,
      })
      .returning();
    return result[0];
  }

  /**
   * Update a product (within org scope)
   * Throws if product not found
   */
  async update(
    id: string,
    data: Partial<Product>,
    orgId: string,
  ): Promise<Product> {
    const result = await db
      .update(products)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(products.id, id), eq(products.org_id, orgId)))
      .returning();

    if (!result[0]) {
      throw new Error(`Product ${id} not found`);
    }

    return result[0];
  }

  /**
   * Soft delete a product by setting is_active = false
   */
  async softDelete(id: string, orgId: string): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ is_active: false, updated_at: new Date() })
      .where(and(eq(products.id, id), eq(products.org_id, orgId)));
    return true;
  }

  /**
   * Hard delete a product (use with caution)
   */
  async delete(id: string, orgId: string): Promise<boolean> {
    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.org_id, orgId)));
    return true;
  }

  /**
   * Update stock quantity for a product
   * Enforces that quantity never goes negative
   * Returns the updated product with new quantity
   */
  async updateStock(
    id: string,
    orgId: string,
    delta: number,
  ): Promise<Product> {
    // Fetch current quantity
    const product = await this.findById(id, orgId);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }

    const currentQty = product.quantity_in_stock || 0;
    const newQuantity = currentQty + delta;
    if (newQuantity < 0) {
      throw new Error(
        `Insufficient stock for product ${id}. Current: ${currentQty}, Required: ${Math.abs(
          delta,
        )}, Shortfall: ${Math.abs(newQuantity)}`,
      );
    }

    const updated = await this.update(
      id,
      { quantity_in_stock: newQuantity } as Partial<Product>,
      orgId,
    );

    return updated;
  }

  /**
   * Get product statistics for an org
   */
  async getStats(orgId: string): Promise<{
    total: number;
    lowStock: number;
    nearExpiry: number;
    totalValue: number;
  }> {
    const stats = await db
      .select({
        total: sql<string>`COUNT(*)`,
        low_stock: sql<string>`SUM(CASE WHEN quantity_in_stock < min_stock_level THEN 1 ELSE 0 END)`,
        near_expiry: sql<string>`SUM(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND expiry_date > CURRENT_DATE THEN 1 ELSE 0 END)`,
        total_value: sql<string>`SUM(quantity_in_stock::numeric * mrp::numeric)`,
      })
      .from(products)
      .where(and(eq(products.org_id, orgId), eq(products.is_active, true)));

    const row = stats[0] as any;
    return {
      total: parseInt(row.total) || 0,
      lowStock: parseInt(row.low_stock) || 0,
      nearExpiry: parseInt(row.near_expiry) || 0,
      totalValue: parseFloat(row.total_value) || 0,
    };
  }
}

// Export singleton instance
export const productRepository = new ProductRepository();
