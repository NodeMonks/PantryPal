import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "../../server/db";
import {
  billingService,
  inventoryService,
  productService,
  customerService,
} from "../../server/services";
import {
  organizations,
  products,
  customers,
  bills,
  bill_items,
  credit_notes,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

describe("BillingService", () => {
  let testOrgId: string;
  let testProductId: string;
  let testCustomerId: string;
  let testBillId: string;

  beforeAll(async () => {
    // Setup: Create org, product, customer
    const [org] = await db
      .insert(organizations)
      .values({ name: "Billing Service Test Org" })
      .returning();
    testOrgId = org.id;

    const [product] = await db
      .insert(products)
      .values({
        org_id: testOrgId,
        name: "Test Product",
        category: "Electronics",
        mrp: "1000.00",
        buying_cost: "800.00",
        quantity_in_stock: 100,
        is_active: true,
      })
      .returning();
    testProductId = product.id;

    const [customer] = await db
      .insert(customers)
      .values({
        org_id: testOrgId,
        name: "Test Customer",
        phone: "9876543210",
      })
      .returning();
    testCustomerId = customer.id;

    const [bill] = await db
      .insert(bills)
      .values({
        org_id: testOrgId,
        bill_number: `TEST-BILL-${Date.now()}`,
        customer_id: testCustomerId,
        total_amount: "0.00",
        final_amount: "0.00",
      })
      .returning();
    testBillId = bill.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testBillId) {
      await db.delete(credit_notes).where(eq(credit_notes.bill_id, testBillId));
      await db.delete(bill_items).where(eq(bill_items.bill_id, testBillId));
      await db.delete(bills).where(eq(bills.id, testBillId));
    }
    if (testCustomerId) {
      await db.delete(customers).where(eq(customers.id, testCustomerId));
    }
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe("Bill creation and item management", () => {
    it("should create a draft bill", async () => {
      const bill = await billingService.createBill(
        {
          bill_number: `NEW-BILL-${Date.now()}`,
          customer_id: testCustomerId,
          total_amount: "0.00",
          final_amount: "0.00",
        },
        testOrgId
      );

      expect(bill).toBeDefined();
      expect(bill.bill_number).toContain("NEW-BILL");
      expect(bill.finalized_at).toBeNull();

      // Cleanup
      await db.delete(bills).where(eq(bills.id, bill.id));
    });

    it("should add item to non-finalized bill", async () => {
      const item = await billingService.addBillItem(
        testBillId,
        testProductId,
        5,
        testOrgId
      );

      expect(item).toBeDefined();
      expect(item.bill_id).toBe(testBillId);
      expect(item.quantity).toBe(5);
      expect(parseFloat(item.unit_price)).toBe(1000);
    });

    it("should prevent adding items to finalized bill", async () => {
      // First finalize the bill
      await billingService.finalizeBill(testBillId, testOrgId, "test-user");

      // Try to add item to finalized bill
      await expect(
        billingService.addBillItem(testBillId, testProductId, 2, testOrgId)
      ).rejects.toThrow("immutable");
    }, 10000); // Increase timeout for transaction
  });

  describe("Bill finalization and immutability", () => {
    it("should enforce non-empty bill before finalization", async () => {
      const emptyBill = await db
        .insert(bills)
        .values({
          org_id: testOrgId,
          bill_number: `EMPTY-${Date.now()}`,
          total_amount: "0.00",
          final_amount: "0.00",
        })
        .returning();

      await expect(
        billingService.finalizeBill(emptyBill[0].id, testOrgId, "test-user")
      ).rejects.toThrow("empty");

      // Cleanup
      await db.delete(bills).where(eq(bills.id, emptyBill[0].id));
    });

    it("should prevent double finalization", async () => {
      const bill = await db
        .insert(bills)
        .values({
          org_id: testOrgId,
          bill_number: `DOUBLE-${Date.now()}`,
          total_amount: "100.00",
          final_amount: "100.00",
        })
        .returning();

      const billId = bill[0].id;

      // Add an item first
      await db
        .insert(bill_items)
        .values({
          bill_id: billId,
          org_id: testOrgId,
          product_id: testProductId,
          quantity: 1,
          unit_price: "100.00",
          total_price: "100.00",
        })
        .returning();

      // Finalize once
      await billingService.finalizeBill(billId, testOrgId, "user1");

      // Try to finalize again
      await expect(
        billingService.finalizeBill(billId, testOrgId, "user2")
      ).rejects.toThrow("already finalized");

      // Cleanup
      await db.delete(bill_items).where(eq(bill_items.bill_id, billId));
      await db.delete(bills).where(eq(bills.id, billId));
    });

    it("should enforce stock validation during finalization", async () => {
      const lowStockProduct = await db
        .insert(products)
        .values({
          org_id: testOrgId,
          name: "Low Stock Product",
          category: "Test",
          mrp: "500.00",
          buying_cost: "400.00",
          quantity_in_stock: 2,
          is_active: true,
        })
        .returning();

      const bill = await db
        .insert(bills)
        .values({
          org_id: testOrgId,
          bill_number: `STOCK-CHECK-${Date.now()}`,
          total_amount: "1000.00",
          final_amount: "1000.00",
        })
        .returning();

      // Add item requesting more than available
      await db
        .insert(bill_items)
        .values({
          bill_id: bill[0].id,
          org_id: testOrgId,
          product_id: lowStockProduct[0].id,
          quantity: 5,
          unit_price: "500.00",
          total_price: "2500.00",
        })
        .returning();

      // Finalization should fail due to insufficient stock
      await expect(
        billingService.finalizeBill(bill[0].id, testOrgId, "user")
      ).rejects.toThrow("Stock validation failed");

      // Cleanup
      await db.delete(bill_items).where(eq(bill_items.bill_id, bill[0].id));
      await db.delete(bills).where(eq(bills.id, bill[0].id));
      await db.delete(products).where(eq(products.id, lowStockProduct[0].id));
    });
  });

  describe("Credit notes", () => {
    it("should create credit note only for finalized bills", async () => {
      const draftBill = await db
        .insert(bills)
        .values({
          org_id: testOrgId,
          bill_number: `DRAFT-${Date.now()}`,
          total_amount: "100.00",
          final_amount: "100.00",
        })
        .returning();

      // Should reject for non-finalized bill
      await expect(
        billingService.createCreditNote(draftBill[0].id, 10, "test", testOrgId)
      ).rejects.toThrow("not finalized");

      // Cleanup
      await db.delete(bills).where(eq(bills.id, draftBill[0].id));
    });

    it("should enforce credit note amount limits", async () => {
      const finalizedBill = await db
        .insert(bills)
        .values({
          org_id: testOrgId,
          bill_number: `FINAL-${Date.now()}`,
          total_amount: "100.00",
          final_amount: "100.00",
          finalized_at: new Date(),
          finalized_by: "test-user",
        })
        .returning();

      // Should reject credit exceeding bill amount
      await expect(
        billingService.createCreditNote(
          finalizedBill[0].id,
          150,
          "test",
          testOrgId
        )
      ).rejects.toThrow("exceeds");

      // Cleanup
      await db.delete(bills).where(eq(bills.id, finalizedBill[0].id));
    });
  });
});

describe("InventoryService", () => {
  let testOrgId: string;
  let testProductId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Inventory Service Test Org" })
      .returning();
    testOrgId = org.id;

    const [product] = await db
      .insert(products)
      .values({
        org_id: testOrgId,
        name: "Stock Test Product",
        category: "Inventory",
        mrp: "500.00",
        buying_cost: "300.00",
        quantity_in_stock: 50,
        is_active: true,
      })
      .returning();
    testProductId = product.id;
  });

  afterAll(async () => {
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe("Stock invariants", () => {
    it("should prevent negative stock on stock out", async () => {
      await expect(
        inventoryService.recordStockOut(
          testProductId,
          100, // More than available (50)
          "sale",
          null,
          null,
          testOrgId
        )
      ).rejects.toThrow("Insufficient");
    });

    it("should prevent adjustment resulting in negative stock", async () => {
      await expect(
        inventoryService.adjustStock(
          testProductId,
          -100, // Would make stock negative
          "test adjustment",
          testOrgId
        )
      ).rejects.toThrow("negative");
    });

    it("should allow zero-delta detection", async () => {
      await expect(
        inventoryService.adjustStock(testProductId, 0, "no-op", testOrgId)
      ).rejects.toThrow("cannot be zero");
    });
  });

  describe("Stock in/out transactions", () => {
    it("should record stock in and update product", async () => {
      const initialProduct = await productService.getProduct(
        testProductId,
        testOrgId
      );
      const initialStock = initialProduct?.quantity_in_stock || 0;

      const result = await inventoryService.recordStockIn(
        testProductId,
        20,
        "purchase",
        "PO-123",
        "Bulk purchase",
        testOrgId
      );

      expect(result.product).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.product?.quantity_in_stock).toBe(initialStock + 20);
      expect(result.transaction.transaction_type).toBe("in");
    });

    it("should record stock out and update product", async () => {
      const initialProduct = await productService.getProduct(
        testProductId,
        testOrgId
      );
      const initialStock = initialProduct?.quantity_in_stock || 0;

      const result = await inventoryService.recordStockOut(
        testProductId,
        5,
        "sale",
        "SALE-001",
        "Customer purchase",
        testOrgId
      );

      expect(result.product).toBeDefined();
      expect(result.product?.quantity_in_stock).toBe(initialStock - 5);
      expect(result.transaction.transaction_type).toBe("out");
    });
  });

  describe("Stock queries", () => {
    it("should get current stock level", async () => {
      const stock = await inventoryService.getStock(testProductId, testOrgId);
      expect(stock).toBeGreaterThanOrEqual(0);
    });

    it("should check low stock threshold", async () => {
      const isLow = await inventoryService.isLowStock(testProductId, testOrgId);
      // Result depends on product configuration
      expect(typeof isLow).toBe("boolean");
    });
  });
});

describe("ProductService", () => {
  let testOrgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Product Service Test Org" })
      .returning();
    testOrgId = org.id;
  });

  afterAll(async () => {
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe("Product uniqueness constraints", () => {
    it("should enforce barcode uniqueness within org", async () => {
      const barcode = `BAR-${Date.now()}`;
      const product1 = await productService.createProduct(
        {
          name: "Product 1",
          category: "Test",
          barcode,
          mrp: "100.00",
          buying_cost: "80.00",
          quantity_in_stock: 10,
        },
        testOrgId
      );

      expect(product1).toBeDefined();

      // Try to create duplicate barcode
      await expect(
        productService.createProduct(
          {
            name: "Product 2",
            category: "Test",
            barcode, // Same barcode
            mrp: "200.00",
            buying_cost: "150.00",
            quantity_in_stock: 5,
          },
          testOrgId
        )
      ).rejects.toThrow("already exists");

      // Cleanup
      await db.delete(products).where(eq(products.id, product1.id));
    });

    it("should enforce QR code uniqueness within org", async () => {
      const qrCode = `QR-${Date.now()}`;
      const product1 = await productService.createProduct(
        {
          name: "QR Product 1",
          category: "Test",
          qr_code: qrCode,
          mrp: "100.00",
          buying_cost: "80.00",
          quantity_in_stock: 10,
        },
        testOrgId
      );

      await expect(
        productService.createProduct(
          {
            name: "QR Product 2",
            category: "Test",
            qr_code: qrCode, // Same QR
            mrp: "200.00",
            buying_cost: "150.00",
            quantity_in_stock: 5,
          },
          testOrgId
        )
      ).rejects.toThrow("already exists");

      // Cleanup
      await db.delete(products).where(eq(products.id, product1.id));
    });
  });

  describe("Product search and filtering", () => {
    it("should search product by barcode", async () => {
      const barcode = `SEARCH-${Date.now()}`;
      const created = await productService.createProduct(
        {
          name: "Searchable Product",
          category: "Test",
          barcode,
          mrp: "100.00",
          buying_cost: "80.00",
          quantity_in_stock: 10,
        },
        testOrgId
      );

      const found = await productService.searchByCode(barcode, testOrgId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);

      // Cleanup
      await db.delete(products).where(eq(products.id, created.id));
    });

    it("should list active products only", async () => {
      const product = await productService.createProduct(
        {
          name: "Active Product",
          category: "Test",
          mrp: "100.00",
          buying_cost: "80.00",
          quantity_in_stock: 10,
        },
        testOrgId
      );

      const allProducts = await productService.listProducts(testOrgId);
      const found = allProducts.find((p) => p.id === product.id);
      expect(found).toBeDefined();

      // Soft delete and verify not in list
      await productService.deleteProduct(product.id, testOrgId);
      const afterDelete = await productService.listProducts(testOrgId);
      const notFound = afterDelete.find((p) => p.id === product.id);
      expect(notFound).toBeUndefined();
    });
  });
});

describe("CustomerService", () => {
  let testOrgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Customer Service Test Org" })
      .returning();
    testOrgId = org.id;
  });

  afterAll(async () => {
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe("Customer uniqueness", () => {
    it("should enforce email uniqueness within org", async () => {
      const email = `test-${Date.now()}@example.com`;
      const customer1 = await customerService.createCustomer(
        {
          name: "Customer 1",
          email,
        },
        testOrgId
      );

      await expect(
        customerService.createCustomer(
          {
            name: "Customer 2",
            email, // Same email
          },
          testOrgId
        )
      ).rejects.toThrow("already exists");

      // Cleanup
      await db.delete(customers).where(eq(customers.id, customer1.id));
    });

    it("should enforce phone uniqueness within org", async () => {
      const phone = `98765${Date.now().toString().slice(-5)}`;
      const customer1 = await customerService.createCustomer(
        {
          name: "Phone Customer 1",
          phone,
        },
        testOrgId
      );

      await expect(
        customerService.createCustomer(
          {
            name: "Phone Customer 2",
            phone, // Same phone
          },
          testOrgId
        )
      ).rejects.toThrow("already exists");

      // Cleanup
      await db.delete(customers).where(eq(customers.id, customer1.id));
    });
  });

  describe("Customer search", () => {
    it("should search customers by name", async () => {
      const customer = await customerService.createCustomer(
        {
          name: "John Searchable",
          email: `john-${Date.now()}@test.com`,
        },
        testOrgId
      );

      const results = await customerService.searchCustomers("John", testOrgId);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.id === customer.id)).toBe(true);

      // Cleanup
      await db.delete(customers).where(eq(customers.id, customer.id));
    });
  });
});
