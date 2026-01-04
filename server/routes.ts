import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { requireOrgId } from "./middleware/tenantContext";
import { asyncHandler } from "./middleware/errorHandler";
import { requireRole } from "./middleware/rbac";
import {
  productService,
  inventoryService,
  billingService,
  customerService,
} from "./services";
import {
  createProductRequestSchema,
  updateProductRequestSchema,
  createCustomerRequestSchema,
  createBillRequestSchema,
  addBillItemRequestSchema,
  createCreditNoteRequestSchema,
} from "./models/dtos";
import { validateRequestBody } from "./middleware/validation";
import dotenv from "dotenv";

import type { SQL } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { env } from "./config/env";
import { getPlanLimits } from "./utils/planLimits";

// Import product image router

dotenv.config();

// --- Razorpay SDK import and initialization ---
import Razorpay from "razorpay";
let razorpay: Razorpay | null = null;

// In CI/test environments, Razorpay keys are often intentionally unset.
// Avoid throwing at import time; endpoints can respond with a 400 when unconfigured.
if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register product image proxy route

  // Public: Subscription plans (authoritative plan details for UI)
  app.get(
    "/api/plans",
    asyncHandler(async (_req, res) => {
      const starterLimits = getPlanLimits("starter-monthly");
      const premiumLimits = getPlanLimits("premium-monthly");

      const toDisplay = (value: number) =>
        Number.isFinite(value) ? value : "Unlimited";

      const plans = [
        {
          id: "starter-monthly",
          name: "Starter",
          price: 399,
          currency: "INR",
          interval: "month",
          tagline: "Built for MSMEs starting out",
          highlights: [
            "Up to 1 store",
            "Inventory + billing",
            "Role-based access",
          ],
          limits: {
            stores: toDisplay(starterLimits.maxStores),
            roles: {
              admin_or_owner: toDisplay(
                starterLimits.maxRoleUsers.adminOrOwner
              ),
              store_manager: toDisplay(
                starterLimits.maxRoleUsers.store_manager
              ),
              inventory_manager: toDisplay(
                starterLimits.maxRoleUsers.inventory_manager
              ),
            },
          },
          includes: [
            "GST-ready billing & invoices",
            "Inventory, barcode/QR workflow",
            "Email invites for staff",
            "Audit-friendly activity history",
          ],
        },
        {
          id: "premium-monthly",
          name: "Premium",
          price: 999,
          currency: "INR",
          interval: "month",
          tagline: "Scale without limits",
          highlights: ["Unlimited stores", "All features", "Unlimited users"],
          limits: {
            stores: toDisplay(premiumLimits.maxStores),
            roles: {
              admin_or_owner: toDisplay(
                premiumLimits.maxRoleUsers.adminOrOwner
              ),
              store_manager: toDisplay(
                premiumLimits.maxRoleUsers.store_manager
              ),
              inventory_manager: toDisplay(
                premiumLimits.maxRoleUsers.inventory_manager
              ),
            },
          },
          includes: [
            "Everything in Starter",
            "Unlimited stores & users",
            "Best for multi-branch MSMEs",
          ],
          badge: "Most Popular",
        },
      ];

      res.status(200).json({ ok: true, plans });
    })
  );

  // Barcode/QR Code Search API - Fast product lookup by code
  app.get(
    "/api/products/search/:code",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const { code } = req.params;
      const orgId = requireOrgId(req);
      const product = await productService.searchByCode(code, orgId);
      if (!product) {
        return res.status(404).json({ error: "Product not found", code });
      }
      res.json(product);
    })
  );

  // Quick action: Update stock quantity
  app.patch(
    "/api/products/:id/stock",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const id = req.params.id;
      const { operation, quantity } = req.body as {
        operation: "set" | "add" | "subtract";
        quantity: number;
      };

      const product = await productService.getProduct(id, orgId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const deltaQty = Number(quantity) || 0;
      if (deltaQty < 0) {
        return res.status(400).json({ error: "Quantity must be positive" });
      }

      const currentQty = Number(product.quantity_in_stock) || 0;
      let delta: number;
      switch (operation) {
        case "set":
          delta = (Number(quantity) || 0) - currentQty;
          break;
        case "add":
          delta = Number(quantity) || 0;
          break;
        case "subtract":
          delta = -(Number(quantity) || 0);
          break;
        default:
          return res.status(400).json({
            error: "Invalid operation. Use 'set', 'add', or 'subtract'",
          });
      }

      const { product: updatedProduct } = await inventoryService.adjustStock(
        id,
        delta,
        `Stock ${operation} via barcode scanner`,
        orgId
      );

      res.json(updatedProduct);
    })
  );

  // Products API - Different roles have different permissions
  app.get(
    "/api/products",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const products = await productService.listProducts(orgId);
      res.json(products);
    })
  );

  app.get(
    "/api/products/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const product = await productService.getProduct(req.params.id, orgId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    })
  );

  // Only admin and manager can create products
  app.post(
    "/api/products",
    isAuthenticated,
    requireRole("admin", "store_manager"),
    // normalize empty date strings before validation
    (req, _res, next) => {
      if (req.body) {
        if (req.body.manufacturing_date === "")
          req.body.manufacturing_date = undefined;
        if (req.body.expiry_date === "") req.body.expiry_date = undefined;

        // Ensure numeric fields are numbers, not strings
        if (typeof req.body.quantity_in_stock === "string") {
          req.body.quantity_in_stock =
            parseInt(req.body.quantity_in_stock) || 0;
        }
        if (typeof req.body.min_stock_level === "string") {
          req.body.min_stock_level = parseInt(req.body.min_stock_level) || 5;
        }
      }
      next();
    },
    validateRequestBody(createProductRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      try {
        const product = await productService.createProduct(req.body, orgId);
        res.status(201).json(product);
      } catch (error) {
        console.error("🔴 Product creation error:", {
          error: error instanceof Error ? error.message : String(error),
          requestBody: req.body,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    })
  );

  // Only admin and manager can update products
  app.put(
    "/api/products/:id",
    isAuthenticated,
    requireRole("admin", "store_manager"),
    (req, _res, next) => {
      if (req.body) {
        if (req.body.manufacturing_date === "")
          req.body.manufacturing_date = undefined;
        if (req.body.expiry_date === "") req.body.expiry_date = undefined;
      }
      next();
    },
    validateRequestBody(updateProductRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const product = await productService.updateProduct(
        req.params.id,
        req.body,
        orgId
      );
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    })
  );

  // Only admin and manager can delete products
  app.delete(
    "/api/products/:id",
    isAuthenticated,
    requireRole("admin", "store_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const ok = await productService.deleteProduct(req.params.id, orgId);
      if (!ok) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    })
  );

  // Archive product (soft delete)
  app.patch(
    "/api/products/:id/archive",
    isAuthenticated,
    requireRole("admin", "store_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const product = await productService.updateProduct(
        req.params.id,
        { is_active: false } as any,
        orgId
      );
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product archived", product });
    })
  );

  // Unarchive product (restore)
  app.patch(
    "/api/products/:id/unarchive",
    isAuthenticated,
    requireRole("admin", "store_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const product = await productService.updateProduct(
        req.params.id,
        { is_active: true } as any,
        orgId
      );
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product restored", product });
    })
  );

  // ============================
  // Payments (Razorpay) Endpoints
  // ============================
  // Create subscription intent (server creates subscription/order metadata)

  app.post(
    "/api/payments/create-subscription",
    asyncHandler(async (req, res) => {
      if (!razorpay) {
        return res.status(400).json({
          ok: false,
          error: "Razorpay is not configured",
        });
      }

      const bodySchema = z.object({
        plan: z.string().default(env.SUBSCRIPTION_DEFAULT_PLAN),
        metadata: z.record(z.any()).optional(),
      });
      const { plan, metadata } = bodySchema.parse(req.body || {});

      // Map frontend plan keys to actual Razorpay plan_ids from environment variables
      const planMap: Record<string, string | undefined> = {
        "starter-monthly": env.RAZORPAY_PLAN_ID_STARTER_MONTHLY,
        "premium-monthly": env.RAZORPAY_PLAN_ID_PREMIUM_MONTHLY,
        // Aliases / optional tiers
        "professional-monthly":
          env.RAZORPAY_PLAN_ID_PROFESSIONAL_MONTHLY ||
          env.RAZORPAY_PLAN_ID_PREMIUM_MONTHLY,
        "enterprise-monthly": env.RAZORPAY_PLAN_ID_ENTERPRISE_MONTHLY,
      };
      const plan_id = planMap[plan];
      if (!plan_id) {
        return res.status(400).json({
          ok: false,
          error: "Invalid plan selected or plan_id not set in environment.",
        });
      }
      try {
        const subscription = await razorpay.subscriptions.create({
          plan_id,
          customer_notify: 1,
          total_count: 12, // e.g., for 12 months
        });
        res.status(200).json({
          ok: true,
          provider: "razorpay",
          key_id: env.RAZORPAY_KEY_ID || "",
          plan,
          subscription_id: subscription.id,
          metadata: metadata || {},
        });
      } catch (error) {
        console.error("Razorpay subscription error:", error);
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ ok: false, error: message });
      }
    })
  );

  // Verify payment signature after checkout
  app.post(
    "/api/payments/verify",
    asyncHandler(async (req, res) => {
      const verifySchema = z.object({
        razorpay_payment_id: z.string(),
        razorpay_subscription_id: z.string().optional(),
        razorpay_order_id: z.string().optional(),
        razorpay_signature: z.string(),
        plan: z.string().optional(),
      });
      const payload = verifySchema.parse(req.body || {});

      // Build verification message as per Razorpay docs (order_id|payment_id or subscription_id|payment_id)
      const message = payload.razorpay_order_id
        ? `${payload.razorpay_order_id}|${payload.razorpay_payment_id}`
        : `${payload.razorpay_subscription_id}|${payload.razorpay_payment_id}`;

      const secret = env.RAZORPAY_KEY_SECRET || "";
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(message)
        .digest("hex");

      const valid =
        !!secret && expectedSignature === payload.razorpay_signature;
      if (!valid) {
        return res.status(400).json({ ok: false, error: "Invalid signature" });
      }

      // Issue short-lived onboarding token to allow organization registration.
      const { signAccessToken } = await import("./utils/jwt");
      const onboardingToken = signAccessToken({
        sub:
          payload.razorpay_subscription_id ||
          payload.razorpay_order_id ||
          payload.razorpay_payment_id,
        roles: ["onboarding"],
        plan: payload.plan,
      });

      res.status(200).json({ ok: true, onboardingToken });
    })
  );

  // Razorpay webhook receiver (idempotent handling recommended)
  app.post(
    "/api/payments/webhook",
    asyncHandler(async (req, res) => {
      const signatureHeader = req.header("X-Razorpay-Signature") || "";
      const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || "";
      const body = JSON.stringify(req.body || {});
      const digest = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      const valid = !!webhookSecret && digest === signatureHeader;

      if (!valid) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid webhook signature" });
      }

      // TODO: Persist event to payment_events table and reconcile subscription state
      // For now, acknowledge receipt
      res.status(200).json({ ok: true });
    })
  );

  // Customers API - All authenticated users can view
  app.get(
    "/api/customers",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const customers = await customerService.listCustomers(orgId);
      res.json(customers);
    })
  );

  app.post(
    "/api/customers",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(createCustomerRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const customer = await customerService.createCustomer(req.body, orgId);
      res.status(201).json(customer);
    })
  );

  // Bills API - All authenticated users can view
  app.get(
    "/api/bills",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { billRepository } = await import("./repositories");
      const bills = await billRepository.findAll(orgId);
      res.json(bills);
    })
  );

  // Scalable, paginated bills endpoint with keyset pagination
  app.get(
    "/api/bills/page",
    isAuthenticated,
    asyncHandler(async (req, res) => {
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

      let whereCond: SQL = eq(bills.org_id, orgId) as unknown as SQL;
      if (cursorCreatedAt && cursorId) {
        const createdAt = cursorCreatedAt as Date;
        const id = cursorId as string;
        const paginationCond: SQL = or(
          and(eq(bills.created_at, createdAt), lt(bills.id, id)),
          lt(bills.created_at, createdAt)
        ) as unknown as SQL;
        whereCond = and(
          eq(bills.org_id, orgId),
          paginationCond
        ) as unknown as SQL;
      }

      const rows = await db
        .select()
        .from(bills)
        .where(whereCond)
        .orderBy((bills as any).created_at, (bills as any).id)
        .limit(limit);

      const items = rows.reverse();
      const last = items[items.length - 1];
      const nextCursor = last
        ? { createdAt: last.created_at, id: last.id }
        : null;

      res.json({ items, nextCursor, limit });
    })
  );

  app.get(
    "/api/bills/today",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { db } = await import("./db");
      const { bills } = await import("../shared/schema");
      const { and, eq, gte, lt, desc } = await import("drizzle-orm");
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const rows = await db
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.org_id, orgId),
            gte(bills.created_at, startOfDay),
            lt(bills.created_at, endOfDay)
          )
        )
        .orderBy(desc(bills.created_at));

      res.json(rows);
    })
  );

  // Staff, manager, and admin can create bills
  app.post(
    "/api/bills",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(createBillRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const bill = await billingService.createBill(req.body, orgId);
      res.status(201).json(bill);
    })
  );

  // Finalize a bill to prevent further mutation
  app.patch(
    "/api/bills/:billId/finalize",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const finalizedBy =
        (req as any)?.user?.username || (req as any)?.user?.id || "system";
      const bill = await billingService.finalizeBill(
        req.params.billId,
        orgId,
        String(finalizedBy)
      );
      res.json(bill);
    })
  );

  // Bill items API
  app.get(
    "/api/bills/:billId/items",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { billItemRepository } = await import("./repositories");
      const items = await billItemRepository.findByBillId(
        req.params.billId,
        orgId
      );
      res.json(items);
    })
  );

  app.post(
    "/api/bills/:billId/items",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(addBillItemRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const item = await billingService.addBillItem(
        req.params.billId,
        req.body.product_id,
        req.body.quantity,
        orgId
      );
      res.status(201).json(item);
    })
  );

  // Credit notes API
  const creditNoteSchema = z.object({
    amount: z.number().positive(),
    reason: z.string().optional(),
  });

  app.get(
    "/api/bills/:billId/credit-notes",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { billRepository, creditNoteRepository } = await import(
        "./repositories"
      );
      const bill = await billRepository.findById(req.params.billId, orgId);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      const notes = await creditNoteRepository.findByBillId(
        req.params.billId,
        orgId
      );
      res.json(notes);
    })
  );

  app.post(
    "/api/bills/:billId/credit-notes",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(createCreditNoteRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const note = await billingService.createCreditNote(
        req.params.billId,
        req.body.amount,
        req.body.reason,
        orgId
      );
      res.status(201).json(note);
    })
  );

  // Inventory transactions API
  app.get(
    "/api/inventory-transactions",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const productId = req.query.product_id as string | undefined;
      const { inventoryTransactionRepository } = await import("./repositories");
      const transactions = productId
        ? await inventoryTransactionRepository.findByProductId(productId, orgId)
        : await inventoryTransactionRepository.findAll(orgId);
      res.json(transactions);
    })
  );

  app.post(
    "/api/inventory-transactions",
    isAuthenticated,
    requireRole("admin", "store_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const {
        product_id,
        transaction_type,
        quantity,
        reference_type,
        reference_id,
        notes,
      } = req.body as any;
      let result;
      if (transaction_type === "in") {
        result = await inventoryService.recordStockIn(
          product_id,
          Number(quantity),
          reference_type || "adjustment",
          reference_id || null,
          notes || null,
          orgId
        );
      } else if (transaction_type === "out") {
        result = await inventoryService.recordStockOut(
          product_id,
          Number(quantity),
          reference_type || "adjustment",
          reference_id || null,
          notes || null,
          orgId
        );
      } else {
        // adjustment
        const delta = Number(quantity) || 0;
        const adj = await inventoryService.adjustStock(
          product_id,
          delta,
          notes || "adjustment",
          orgId
        );
        result = adj;
      }
      res.status(201).json(result.transaction);
    })
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
        orgId: (req.user as any)?.orgId,
        roles: userWithRole ? [userWithRole.roleName] : [],
        permissions: [],
        stores: [],
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
  app.get(
    "/api/dashboard/stats",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const lowStock = await productService.getLowStockProducts(orgId);
      const expiring = await productService.getExpiringProducts(orgId, 7);
      const { billRepository } = await import("./repositories");
      const allBills = await billRepository.findAll(orgId);
      const customers = await customerService.listCustomers(orgId);

      const totalRevenue = allBills.reduce(
        (sum, bill) => sum + Number(bill.final_amount || 0),
        0
      );

      const stats = {
        totalProducts: (await productService.listProducts(orgId)).length,
        lowStock: lowStock.length,
        todaySales: await (async () => {
          const { db } = await import("./db");
          const { bills } = await import("../shared/schema");
          const { and, eq, gte, lt } = await import("drizzle-orm");
          const today = new Date();
          const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
          const endOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1
          );
          const rows = await db
            .select()
            .from(bills)
            .where(
              and(
                eq(bills.org_id, orgId),
                gte(bills.created_at, startOfDay),
                lt(bills.created_at, endOfDay)
              )
            );
          return rows.length;
        })(),
        totalRevenue,
        expiringProducts: expiring.length,
        totalCustomers: customers.length,
        lowStockProducts: lowStock,
        expiringProductsList: expiring,
      };

      res.json(stats);
    })
  );

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
          planName: organizations.plan_name,
          paymentStatus: organizations.payment_status,
          kycStatus: organizations.kyc_status,
          gstNumber: organizations.gst_number,
          ownerName: organizations.owner_name,
          ownerEmail: organizations.owner_email,
          ownerPhone: organizations.owner_phone,
          businessCity: organizations.business_city,
          businessState: organizations.business_state,
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
          planName: data.planName,
          paymentStatus: data.paymentStatus,
          kycStatus: data.kycStatus,
          gstNumber: data.gstNumber,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          ownerPhone: data.ownerPhone,
          businessCity: data.businessCity,
          businessState: data.businessState,
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
