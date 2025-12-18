import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import {
  organizations,
  users,
  user_roles,
  roles,
  products,
  customers,
  bills,
  bill_items,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../server/auth";

/**
 * Route Integration Tests
 * Tests route handlers via direct service calls and database state verification
 * Rather than full HTTP requests (which require complex server setup)
 */

let testOrgId: string;
let testUserId: number;
let testProductId: string;
let testCustomerId: string;
let testBillId: string;

beforeAll(async () => {
  // Setup test data
  const [org] = await db
    .insert(organizations)
    .values({ name: "Route Integration Test Org" })
    .returning();
  testOrgId = org.id;

  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "admin"))
    .limit(1);

  const [user] = await db
    .insert(users)
    .values({
      username: `test-admin-${Date.now()}`,
      email: `test-${Date.now()}@routes.test`,
      password: hashPassword("testpass123"),
      is_active: true,
    })
    .returning();
  testUserId = user.id;

  await db.insert(user_roles).values({
    user_id: user.id,
    org_id: testOrgId,
    role_id: role.id,
  });

  const [product] = await db
    .insert(products)
    .values({
      org_id: testOrgId,
      name: "Route Test Product",
      category: "Electronics",
      barcode: `ROUTE-${Date.now()}`,
      mrp: "500.00",
      buying_cost: "300.00",
      quantity_in_stock: 100,
      is_active: true,
    })
    .returning();
  testProductId = product.id;

  const [customer] = await db
    .insert(customers)
    .values({
      org_id: testOrgId,
      name: "Route Test Customer",
      phone: `987${Date.now().toString().slice(-7)}`,
    })
    .returning();
  testCustomerId = customer.id;

  const [bill] = await db
    .insert(bills)
    .values({
      org_id: testOrgId,
      bill_number: `ROUTE-BILL-${Date.now()}`,
      customer_id: testCustomerId,
      total_amount: "0.00",
      final_amount: "0.00",
    })
    .returning();
  testBillId = bill.id;
});

afterAll(async () => {
  // Cleanup in reverse order
  if (testBillId) {
    await db.delete(bill_items).where(eq(bill_items.bill_id, testBillId));
    await db.delete(bills).where(eq(bills.id, testBillId));
  }
  if (testCustomerId) {
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  }
  if (testProductId) {
    await db.delete(products).where(eq(products.id, testProductId));
  }
  if (testUserId) {
    await db.delete(user_roles).where(eq(user_roles.user_id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  }
  if (testOrgId) {
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  }
});

describe("Products Routes via Services", () => {
  it("should list products via service", async () => {
    const { productService } = await import("../../server/services");
    const products = await productService.listProducts(testOrgId);
    expect(Array.isArray(products)).toBe(true);
    const found = products.find((p) => p.id === testProductId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Route Test Product");
  });

  it("should search product by code", async () => {
    const { productService } = await import("../../server/services");
    const product = await productService.searchByCode(
      `ROUTE-${Date.now() - 1000}`,
      testOrgId
    );
    // Should not find - different timestamp
    expect(product).toBeNull();
  });

  it("should get single product", async () => {
    const { productService } = await import("../../server/services");
    const product = await productService.getProduct(testProductId, testOrgId);
    expect(product).toBeDefined();
    expect(product?.id).toBe(testProductId);
  });
});

describe("Customers Routes via Services", () => {
  it("should list customers", async () => {
    const { customerService } = await import("../../server/services");
    const customers = await customerService.listCustomers(testOrgId);
    expect(Array.isArray(customers)).toBe(true);
    const found = customers.find((c) => c.id === testCustomerId);
    expect(found).toBeDefined();
  });

  it("should create customer with uniqueness", async () => {
    const { customerService } = await import("../../server/services");
    const email = `unique-${Date.now()}@test.com`;
    const customer = await customerService.createCustomer(
      {
        name: "Unique Customer",
        email,
      },
      testOrgId
    );
    expect(customer).toBeDefined();

    // Verify can't create duplicate email
    await expect(
      customerService.createCustomer(
        {
          name: "Another Customer",
          email, // Same email
        },
        testOrgId
      )
    ).rejects.toThrow("already exists");

    // Cleanup
    await db.delete(customers).where(eq(customers.id, customer.id));
  });
});

describe("Bills Routes via Services", () => {
  it("should list bills", async () => {
    const { billRepository } = await import("../../server/repositories");
    const bills = await billRepository.findAll(testOrgId);
    expect(Array.isArray(bills)).toBe(true);
    const found = bills.find((b) => b.id === testBillId);
    expect(found).toBeDefined();
  });

  it("should create bill", async () => {
    const { billingService } = await import("../../server/services");
    const newBill = await billingService.createBill(
      {
        bill_number: `TEST-BILL-${Date.now()}`,
        total_amount: "0.00",
        final_amount: "0.00",
      },
      testOrgId
    );
    expect(newBill).toBeDefined();
    expect(newBill.finalized_at).toBeNull();

    // Cleanup
    await db.delete(bills).where(eq(bills.id, newBill.id));
  });

  it("should enforce bill finalization immutability", async () => {
    const { billingService } = await import("../../server/services");
    const newBill = await billingService.createBill(
      {
        bill_number: `IMMUTABLE-${Date.now()}`,
        total_amount: "100.00",
        final_amount: "100.00",
      },
      testOrgId
    );

    // Add an item first
    await db
      .insert(bill_items)
      .values({
        bill_id: newBill.id,
        org_id: testOrgId,
        product_id: testProductId,
        quantity: 1,
        unit_price: "100.00",
        total_price: "100.00",
      })
      .returning();

    // Finalize
    const finalized = await billingService.finalizeBill(
      newBill.id,
      testOrgId,
      "test-user"
    );
    expect(finalized.finalized_at).toBeDefined();

    // Try to add item to finalized bill
    await expect(
      billingService.addBillItem(newBill.id, testProductId, 1, testOrgId)
    ).rejects.toThrow("immutable");

    // Cleanup
    await db.delete(bill_items).where(eq(bill_items.bill_id, newBill.id));
    await db.delete(bills).where(eq(bills.id, newBill.id));
  });
});

describe("Inventory Routes via Services", () => {
  it("should enforce stock invariants", async () => {
    const { inventoryService } = await import("../../server/services");

    // Should prevent stockout exceeding available
    await expect(
      inventoryService.recordStockOut(
        testProductId,
        200, // More than available 100
        "sale",
        null,
        null,
        testOrgId
      )
    ).rejects.toThrow("Insufficient");
  });

  it("should record stock in", async () => {
    const { inventoryService, productService } = await import(
      "../../server/services"
    );
    const initialProduct = await productService.getProduct(
      testProductId,
      testOrgId
    );
    const initialStock = initialProduct?.quantity_in_stock || 0;

    const result = await inventoryService.recordStockIn(
      testProductId,
      25,
      "purchase",
      "PO-001",
      "Test purchase",
      testOrgId
    );

    expect(result.product).toBeDefined();
    expect(result.product?.quantity_in_stock).toBe(initialStock + 25);
    expect(result.transaction.transaction_type).toBe("in");
  });

  it("should record stock out", async () => {
    const { inventoryService, productService } = await import(
      "../../server/services"
    );
    const initialProduct = await productService.getProduct(
      testProductId,
      testOrgId
    );
    const initialStock = initialProduct?.quantity_in_stock || 0;

    const result = await inventoryService.recordStockOut(
      testProductId,
      10,
      "sale",
      "SALE-001",
      "Customer purchase",
      testOrgId
    );

    expect(result.product).toBeDefined();
    expect(result.product?.quantity_in_stock).toBe(initialStock - 10);
    expect(result.transaction.transaction_type).toBe("out");
  });
});

describe("Multi-tenant Isolation", () => {
  let otherOrgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Other Org for Isolation Test" })
      .returning();
    otherOrgId = org.id;
  });

  afterAll(async () => {
    if (otherOrgId) {
      await db.delete(organizations).where(eq(organizations.id, otherOrgId));
    }
  });

  it("should not access products from other org", async () => {
    const { productService } = await import("../../server/services");
    const products = await productService.listProducts(otherOrgId);
    const found = products.find((p) => p.id === testProductId);
    expect(found).toBeUndefined();
  });

  it("should not access bills from other org", async () => {
    const { billRepository } = await import("../../server/repositories");
    const bills = await billRepository.findAll(otherOrgId);
    const found = bills.find((b) => b.id === testBillId);
    expect(found).toBeUndefined();
  });

  it("should not access customers from other org", async () => {
    const { customerService } = await import("../../server/services");
    const customers = await customerService.listCustomers(otherOrgId);
    const found = customers.find((c) => c.id === testCustomerId);
    expect(found).toBeUndefined();
  });
});
