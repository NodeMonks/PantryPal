import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, hasRole } from "./auth";
import { requireOrgId } from "./middleware/tenantContext";
import dotenv from "dotenv";

dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Barcode/QR Code Search API - Fast product lookup by code
  app.get("/api/products/search/:code", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.params;

      // Log session and user data for debugging
      console.log("🔍 Search request for code:", code);
      console.log("👤 req.user:", req.user);
      console.log("🍪 req.session:", req.session);

      let orgId: string | undefined;

      // Try to get orgId and storeId, handle missing gracefully
      try {
        orgId = requireOrgId(req);
        console.log("✅ orgId:", orgId);
      } catch (e: any) {
        console.error("❌ Missing orgId:", e.message);
        return res.status(401).json({
          error: "Organization context not available. Please log in again.",
          details: e.message,
        });
      }

      // Org-only tenancy: storeId not required

      const { db } = await import("./db");
      const { products } = await import("../shared/schema");
      const { and, eq, or } = await import("drizzle-orm");

      // Build code match condition
      // Only search by ID if the code looks like a UUID (contains dashes and right length)
      const isUuidLike =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          code
        );

      const codeConditions = [
        eq(products.barcode, code),
        eq(products.qr_code, code),
      ];

      if (isUuidLike) {
        codeConditions.push(eq(products.id, code));
      }

      const codeMatch = or(...codeConditions);

      // Build where clause based on available context
      const whereConditions = [eq(products.org_id, orgId), codeMatch];

      // Search by barcode, QR code, or product ID
      const [product] = await db
        .select()
        .from(products)
        .where(and(...whereConditions))
        .limit(1);

      if (product) {
        console.log("✅ Product found:", product.name);
        res.json(product);
      } else {
        console.log("❌ Product not found for code:", code);
        res.status(404).json({ error: "Product not found", code });
      }
    } catch (error: any) {
      console.error("❌ Error searching product by code:", error);
      console.error("Stack trace:", error.stack);
      res
        .status(500)
        .json({ error: "Failed to search product", details: error.message });
    }
  });

  // Quick action: Update stock quantity
  app.patch(
    "/api/products/:id/stock",
    isAuthenticated,
    hasRole("admin", "store_manager", "inventory_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const product = await storage.deleteProduct(req.params.id, {
          orgId,
        });
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product deleted successfully", product });

        // Handle FK violations gracefully: product referenced by bill_items
        if (error?.code === "23503") {
          return res.status(409).json({
            error: "Product cannot be deleted",
            details:
              "This product is referenced in one or more bill items. Remove those references or archive the product instead.",
          });
        }
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Failed to delete product" });
        switch (operation) {
          case "set":
            newQuantity = quantity;
            break;
          case "add":
            newQuantity += quantity;
            break;
          case "subtract":
            newQuantity = Math.max(0, newQuantity - quantity);
            break;
          default:
            return res.status(400).json({
              error: "Invalid operation. Use 'set', 'add', or 'subtract'",
            });
        }

        const updatedProduct = await storage.updateProduct(
          id,
          { quantity_in_stock: newQuantity },
          { orgId }
        );

        // Log inventory transaction
        const transactionType =
          operation === "add"
            ? "in"
            : operation === "subtract"
            ? "out"
            : "adjustment";
        await storage.createInventoryTransaction(
          {
            product_id: id,
            transaction_type: transactionType,
            quantity: Math.abs(quantity),
            reference_type: "adjustment",
            notes: `Stock ${operation} via barcode scanner`,
          },
          { orgId }
        );

        res.json(updatedProduct);
      } catch (error) {
        console.error("Error updating stock:", error);
        res.status(500).json({ error: "Failed to update stock" });
      }
    }
  );

  // Products API - Different roles have different permissions
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const products = await storage.getProducts({ orgId });
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const product = await storage.getProduct(req.params.id, {
        orgId,
      });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Only admin and manager can create products
  app.post(
    "/api/products",
    isAuthenticated,
    hasRole("admin", "store_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        // Convert empty date strings to null to avoid PostgreSQL errors
        const productData = {
          ...req.body,
          manufacturing_date: req.body.manufacturing_date || null,
          expiry_date: req.body.expiry_date || null,
        };

        const product = await storage.createProduct(productData, {
          orgId,
        });
        res.status(201).json(product);
      } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ error: "Failed to create product" });
      }
    }
  );

  // Only admin and manager can update products
  app.put(
    "/api/products/:id",
    isAuthenticated,
    hasRole("admin", "store_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        // Convert empty date strings to null to avoid PostgreSQL errors
        const productData = {
          ...req.body,
          manufacturing_date: req.body.manufacturing_date || null,
          expiry_date: req.body.expiry_date || null,
        };

        const product = await storage.updateProduct(
          req.params.id,
          productData,
          { orgId }
        );
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Failed to update product" });
      }
    }
  );

  // Only admin and manager can delete products
  app.delete(
    "/api/products/:id",
    isAuthenticated,
    hasRole("admin", "store_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const product = await storage.deleteProduct(req.params.id, {
          orgId,
        });
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product deleted successfully", product });
      } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Failed to delete product" });
      }
    }
  );

  // Archive product (soft delete)
  app.patch(
    "/api/products/:id/archive",
    isAuthenticated,
    hasRole("admin", "store_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const product = await storage.updateProduct(
          req.params.id,
          { is_active: false } as any,
          { orgId }
        );
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product archived", product });
      } catch (error) {
        console.error("Error archiving product:", error);
        res.status(500).json({ error: "Failed to archive product" });
      }
    }
  );

  // Unarchive product (restore)
  app.patch(
    "/api/products/:id/unarchive",
    isAuthenticated,
    hasRole("admin", "store_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const product = await storage.updateProduct(
          req.params.id,
          { is_active: true } as any,
          { orgId }
        );
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product restored", product });
      } catch (error) {
        console.error("Error restoring product:", error);
        res.status(500).json({ error: "Failed to restore product" });
      }
    }
  );

  // Customers API - All authenticated users can view
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const customers = await storage.getCustomers({ orgId });
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post(
    "/api/customers",
    isAuthenticated,
    hasRole("admin", "store_manager", "inventory_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const customer = await storage.createCustomer(req.body, {
          orgId,
        });
        res.status(201).json(customer);
      } catch (error) {
        console.error("Error creating customer:", error);
        res.status(500).json({ error: "Failed to create customer" });
      }
    }
  );

  // Bills API - All authenticated users can view
  app.get("/api/bills", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const bills = await storage.getBills({ orgId });
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  // Scalable, paginated bills endpoint with keyset pagination
  app.get("/api/bills/page", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const cursorCreatedAt = req.query.cursorCreatedAt
        ? new Date(String(req.query.cursorCreatedAt))
        : undefined;
      const cursorId = req.query.cursorId
        ? String(req.query.cursorId)
        : undefined;

      const { db } = await import("./db");
      const { bills } = await import("../shared/schema");
      const { and, eq, or, lt } = await import("drizzle-orm");

      const base = [eq(bills.org_id, orgId)];
      if (cursorCreatedAt && cursorId) {
        base.push(
          or(
            and(eq(bills.created_at, cursorCreatedAt), lt(bills.id, cursorId)),
            lt(bills.created_at, cursorCreatedAt)
          )
        );
      }

      const rows = await db
        .select()
        .from(bills)
        .where(and(...base))
        .orderBy((bills as any).created_at, (bills as any).id)
        .limit(limit);

      const items = rows.reverse(); // ensure descending order for UI
      const last = items[items.length - 1];
      const nextCursor = last
        ? { createdAt: last.created_at, id: last.id }
        : null;

      res.json({ items, nextCursor, limit });
    } catch (error) {
      console.error("Error fetching paged bills:", error);
      res.status(500).json({ error: "Failed to fetch paged bills" });
    }
  });

  app.get("/api/bills/today", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const bills = await storage.getBillsForToday({ orgId });
      res.json(bills);
    } catch (error) {
      console.error("Error fetching today's bills:", error);
      res.status(500).json({ error: "Failed to fetch today's bills" });
    }
  });

  // Staff, manager, and admin can create bills
  app.post(
    "/api/bills",
    isAuthenticated,
    hasRole("admin", "store_manager", "inventory_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const bill = await storage.createBill(req.body, { orgId });
        res.status(201).json(bill);
      } catch (error) {
        console.error("Error creating bill:", error);
        res.status(500).json({ error: "Failed to create bill" });
      }
    }
  );

  // Bill items API
  app.get("/api/bills/:billId/items", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const items = await storage.getBillItems(req.params.billId, {
        orgId,
      });
      res.json(items);
    } catch (error) {
      console.error("Error fetching bill items:", error);
      res.status(500).json({ error: "Failed to fetch bill items" });
    }
  });

  app.post(
    "/api/bills/:billId/items",
    isAuthenticated,
    hasRole("admin", "store_manager", "inventory_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const item = await storage.createBillItem(
          {
            ...req.body,
            bill_id: req.params.billId,
          },
          { orgId }
        );
        res.status(201).json(item);
      } catch (error) {
        console.error("Error creating bill item:", error);
        res.status(500).json({ error: "Failed to create bill item" });
      }
    }
  );

  // Inventory transactions API
  app.get("/api/inventory-transactions", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const productId = req.query.product_id as string;
      const transactions = await storage.getInventoryTransactions(
        { orgId },
        productId
      );
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching inventory transactions:", error);
      res.status(500).json({ error: "Failed to fetch inventory transactions" });
    }
  });

  app.post(
    "/api/inventory-transactions",
    isAuthenticated,
    hasRole("admin", "store_manager"),
    async (req, res) => {
      try {
        const orgId = requireOrgId(req);
        const transaction = await storage.createInventoryTransaction(req.body, {
          orgId,
        });
        res.status(201).json(transaction);
      } catch (error) {
        console.error("Error creating inventory transaction:", error);
        res
          .status(500)
          .json({ error: "Failed to create inventory transaction" });
      }
    }
  );

  // RBAC roles API - For invite functionality
  app.get("/api/rbac/roles", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { roles } = await import("../shared/schema");
      const rolesList = await db.select().from(roles);
      res.json(rolesList);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Organization invite API - Session-based
  app.post("/api/org/invite", isAuthenticated, async (req, res) => {
    try {
      console.log("📧 Invite request received");
      console.log("👤 req.user:", req.user);

      const { orgInvite } = await import("./controllers/authController");
      const { db } = await import("./db");
      const { user_roles, roles } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Get user's role name from database through user_roles junction table
      const userId = (req.user as any)?.id;
      console.log("🔍 User ID from session:", userId);

      if (!userId) {
        console.error("❌ No user ID in session");
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Query with proper integer comparison through user_roles table
      const userResults = await db
        .select({
          roleName: roles.name,
        })
        .from(user_roles)
        .innerJoin(roles, eq(user_roles.role_id, roles.id))
        .where(eq(user_roles.user_id, userId))
        .limit(1);

      const userWithRole = userResults[0];
      console.log("🔍 User role from DB:", userWithRole);

      // Add user context from session
      req.ctx = {
        userId: (req.user as any)?.id,
        orgId: (req.user as any)?.org_id,
        roleId: (req.user as any)?.role_id,
        roles: userWithRole ? [userWithRole.roleName] : [],
      };
      console.log("🔍 Request context:", req.ctx);
      await orgInvite(req, res);
    } catch (error: any) {
      console.error("❌ Error sending invite:", error);
      console.error("Stack:", error.stack);
      res
        .status(500)
        .json({ error: "Failed to send invite", details: error.message });
    }
  }); // Dashboard stats API - All authenticated users
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const orgId = requireOrgId(req);
      const products = await storage.getProducts({ orgId });
      const todayBills = await storage.getBillsForToday({ orgId });
      const allBills = await storage.getBills({ orgId });
      const customers = await storage.getCustomers({ orgId });

      const lowStock = products.filter(
        (p) => (p.quantity_in_stock || 0) <= (p.min_stock_level || 0)
      );
      const expiring = products.filter((p) => {
        if (!p.expiry_date) return false;
        const expiryDate = new Date(p.expiry_date);
        const now = new Date();
        const daysDiff = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );
        return daysDiff <= 7 && daysDiff >= 0;
      });

      const stats = {
        totalProducts: products.length,
        lowStock: lowStock.length,
        todaySales: todayBills.length,
        totalRevenue: allBills.reduce(
          (sum, bill) => sum + Number(bill.final_amount),
          0
        ),
        expiringProducts: expiring.length,
        totalCustomers: customers.length,
        lowStockProducts: lowStock,
        expiringProductsList: expiring,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Get user's organization and store details
  app.get("/api/profile/organization", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { user_roles, organizations, stores, roles } = await import(
        "../shared/schema"
      );
      const { eq } = await import("drizzle-orm");

      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user's organization and store through user_roles
      const userRoleData = await db
        .select({
          orgId: user_roles.org_id,
          storeId: user_roles.store_id,
          roleId: user_roles.role_id,
          orgName: organizations.name,
          orgCreatedAt: organizations.created_at,
          storeName: stores.name,
          storeCreatedAt: stores.created_at,
          roleName: roles.name,
        })
        .from(user_roles)
        .leftJoin(organizations, eq(user_roles.org_id, organizations.id))
        .leftJoin(stores, eq(user_roles.store_id, stores.id))
        .leftJoin(roles, eq(user_roles.role_id, roles.id))
        .where(eq(user_roles.user_id, userId))
        .limit(1);

      if (!userRoleData.length) {
        return res.status(404).json({ error: "Organization data not found" });
      }

      const data = userRoleData[0];

      // Get all stores in the organization
      const orgStores = await db
        .select({
          id: stores.id,
          name: stores.name,
          createdAt: stores.created_at,
        })
        .from(stores)
        .where(eq(stores.org_id, data.orgId));

      res.json({
        organization: {
          id: data.orgId,
          name: data.orgName,
          createdAt: data.orgCreatedAt,
          totalStores: orgStores.length,
        },
        currentStore: data.storeId
          ? {
              id: data.storeId,
              name: data.storeName,
              createdAt: data.storeCreatedAt,
            }
          : null,
        allStores: orgStores,
        role: data.roleName,
      });
    } catch (error) {
      console.error("Error fetching organization data:", error);
      res.status(500).json({ error: "Failed to fetch organization data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
