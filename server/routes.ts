import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, hasRole } from "./auth";
import dotenv from "dotenv";

dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Products API - Different roles have different permissions
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
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
        // Convert empty date strings to null to avoid PostgreSQL errors
        const productData = {
          ...req.body,
          manufacturing_date: req.body.manufacturing_date || null,
          expiry_date: req.body.expiry_date || null,
        };

        const product = await storage.createProduct(productData);
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
        // Convert empty date strings to null to avoid PostgreSQL errors
        const productData = {
          ...req.body,
          manufacturing_date: req.body.manufacturing_date || null,
          expiry_date: req.body.expiry_date || null,
        };

        const product = await storage.updateProduct(req.params.id, productData);
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
        const product = await storage.deleteProduct(req.params.id);
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

  // Customers API - All authenticated users can view
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
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
        const customer = await storage.createCustomer(req.body);
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
      const bills = await storage.getBills();
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.get("/api/bills/today", isAuthenticated, async (req, res) => {
    try {
      const bills = await storage.getBillsForToday();
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
        const bill = await storage.createBill(req.body);
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
      const items = await storage.getBillItems(req.params.billId);
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
        const item = await storage.createBillItem({
          ...req.body,
          bill_id: req.params.billId,
        });
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
      const productId = req.query.product_id as string;
      const transactions = await storage.getInventoryTransactions(productId);
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
        const transaction = await storage.createInventoryTransaction(req.body);
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
      const products = await storage.getProducts();
      const todayBills = await storage.getBillsForToday();
      const allBills = await storage.getBills();
      const customers = await storage.getCustomers();

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

  const httpServer = createServer(app);
  return httpServer;
}
