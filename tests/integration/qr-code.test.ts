import { describe, it, expect, beforeAll, afterAll } from "vitest";
import QRCode from "qrcode";
import { db } from "../../server/db";
import { products, organizations } from "../../shared/schema";
import { productService } from "../../server/services";
import { eq } from "drizzle-orm";

/**
 * Integration tests for QR code generation and tenant isolation
 */

describe("QR Code Generation & Tenant Isolation", () => {
  let orgA: string;
  let orgB: string;
  let productA: string;
  let productB: string;

  beforeAll(async () => {
    const [o1] = await db
      .insert(organizations)
      .values({ name: "QR Test Org A" })
      .returning();
    orgA = o1.id;

    const [o2] = await db
      .insert(organizations)
      .values({ name: "QR Test Org B" })
      .returning();
    orgB = o2.id;

    const [p1] = await db
      .insert(products)
      .values({
        org_id: orgA,
        name: "QR Product A",
        category: "Test",
        mrp: "10.00",
        buying_cost: "5.00",
        quantity_in_stock: 5,
      })
      .returning();
    productA = p1.id;

    const [p2] = await db
      .insert(products)
      .values({
        org_id: orgB,
        name: "QR Product B",
        category: "Test",
        mrp: "10.00",
        buying_cost: "5.00",
        quantity_in_stock: 5,
      })
      .returning();
    productB = p2.id;
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.id, productA));
    await db.delete(products).where(eq(products.id, productB));
    await db.delete(organizations).where(eq(organizations.id, orgA));
    await db.delete(organizations).where(eq(organizations.id, orgB));
  });

  it("stores generated QR image for a product", async () => {
    const qrData = productA;
    const qrImage = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    const updated = await productService.updateProduct(
      productA,
      { qr_code: qrData, qr_code_image: qrImage },
      orgA
    );

    expect(updated?.qr_code_image).toBeDefined();
    expect(updated?.qr_code_image).toContain("data:image/png;base64,");
  });

  it("keeps QR codes isolated between tenants", async () => {
    // Assign same qr_code string to both orgs (allowed per-tenant)
    const sharedCode = "SHARED-QR-CODE";

    await productService.updateProduct(productA, { qr_code: sharedCode }, orgA);

    await productService.updateProduct(productB, { qr_code: sharedCode }, orgB);

    const foundA = await productService.searchByCode(sharedCode, orgA);
    const foundB = await productService.searchByCode(sharedCode, orgB);

    expect(foundA?.org_id).toEqual(orgA);
    expect(foundB?.org_id).toEqual(orgB);
  });
});
