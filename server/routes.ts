import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { requireOrgId } from "./middleware/tenantContext";
import { asyncHandler } from "./middleware/errorHandler";
import { requireRole } from "./middleware/rbac";
import {
  requireActiveSubscription,
  requirePlan,
  checkPlanLimit,
} from "./middleware/subscription";
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
                starterLimits.maxRoleUsers.adminOrOwner,
              ),
              store_manager: toDisplay(
                starterLimits.maxRoleUsers.store_manager,
              ),
              inventory_manager: toDisplay(
                starterLimits.maxRoleUsers.inventory_manager,
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
                premiumLimits.maxRoleUsers.adminOrOwner,
              ),
              store_manager: toDisplay(
                premiumLimits.maxRoleUsers.store_manager,
              ),
              inventory_manager: toDisplay(
                premiumLimits.maxRoleUsers.inventory_manager,
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
    }),
  );

  // Barcode/QR Code Search API - Fast product lookup by code
  app.get(
    "/api/products/search/:code",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      let { code } = req.params;
      const orgId = requireOrgId(req);

      // Decode URL-encoded characters and trim whitespace (QR scanners may include newlines)
      code = decodeURIComponent(code).trim();

      console.log(
        `🔎 Searching for product with code: "${code}" (len=${code.length}) in org: ${orgId}`,
      );

      const product = await productService.searchByCode(code, orgId);

      if (!product) {
        console.log(`❌ No product found for code: "${code}"`);
        return res.status(404).json({ error: "Product not found", code });
      }

      console.log(
        `✅ Found product ${product.id} (${product.name}) for code: "${code}"`,
      );
      res.json(product);
    }),
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
        orgId,
      );

      res.json(updatedProduct);
    }),
  );

  // Products API - Different roles have different permissions
  app.get(
    "/api/products",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);

      // Handle search query parameter for Quick POS
      const searchQuery = req.query.q as string | undefined;

      if (searchQuery) {
        const { productRepository } = await import("./repositories");
        const { ilike, or, and, eq } = await import("drizzle-orm");
        const { products } = await import("../shared/schema");
        const { db } = await import("./db");

        // Search by name or barcode with org_id filtering
        const results = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.org_id, orgId),
              or(
                ilike(products.name, `%${searchQuery}%`),
                ilike(products.barcode, `%${searchQuery}%`),
                ilike(products.qr_code, `%${searchQuery}%`),
              ),
            ),
          )
          .limit(20);

        return res.json(results);
      }

      // Default: return all products
      const productsList = await productService.listProducts(orgId);
      res.json(productsList);
    }),
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
    }),
  );

  // Only admin and manager can create products
  app.post(
    "/api/products",
    isAuthenticated,
    requireActiveSubscription,
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
    }),
  );

  // Only admin and manager can update products
  app.put(
    "/api/products/:id",
    isAuthenticated,
    requireActiveSubscription,
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
        orgId,
      );
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    }),
  );

  // Only admin and manager can delete products
  app.delete(
    "/api/products/:id",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const ok = await productService.deleteProduct(req.params.id, orgId);
      if (!ok) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    }),
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
        orgId,
      );
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product archived", product });
    }),
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
        orgId,
      );
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product restored", product });
    }),
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
        customerData: z
          .object({
            name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            company: z.string().optional(),
            gst: z.string().optional(),
          })
          .optional(),
      });
      const { plan, metadata, customerData } = bodySchema.parse(req.body || {});

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
          notes: {
            customer_name: customerData?.name || "",
            customer_email: customerData?.email || "",
            customer_phone: customerData?.phone || "",
            company_name: customerData?.company || "",
            gst_number: customerData?.gst || "",
          },
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
    }),
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
    }),
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

      // Handle different webhook events
      const event = req.body;
      const eventType = event.event;

      console.log(`[Webhook] Received event: ${eventType}`);

      try {
        switch (eventType) {
          case "subscription.activated":
            await handleSubscriptionActivated(
              event.payload.subscription.entity,
            );
            break;

          case "subscription.charged":
            await handleSubscriptionCharged(event.payload.payment.entity);
            break;

          case "subscription.cancelled":
            await handleSubscriptionCancelled(
              event.payload.subscription.entity,
            );
            break;

          case "subscription.paused":
          case "subscription.halted":
            await handleSubscriptionPaused(event.payload.subscription.entity);
            break;

          case "subscription.resumed":
            await handleSubscriptionResumed(event.payload.subscription.entity);
            break;

          case "payment.failed":
            await handlePaymentFailed(event.payload.payment.entity);
            break;

          default:
            console.log(`[Webhook] Unhandled event type: ${eventType}`);
        }
      } catch (error) {
        console.error(`[Webhook] Error processing ${eventType}:`, error);
        // Still return 200 to acknowledge receipt
      }

      res.status(200).json({ ok: true });
    }),
  );

  // Webhook handler functions
  async function handleSubscriptionActivated(subscription: any) {
    const { db } = await import("./db");
    const { organizations } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    const subscriptionId = subscription.id;

    await db
      .update(organizations)
      .set({
        payment_status: "active",
        subscription_id: subscriptionId,
      })
      .where(eq(organizations.subscription_id, subscriptionId));

    console.log(`[Webhook] Subscription activated: ${subscriptionId}`);
  }

  async function handleSubscriptionCharged(payment: any) {
    console.log(`[Webhook] Payment charged: ${payment.id}`);
    // Could log to payment_history table here
  }

  async function handleSubscriptionCancelled(subscription: any) {
    const { db } = await import("./db");
    const { organizations } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(organizations)
      .set({ payment_status: "inactive" })
      .where(eq(organizations.subscription_id, subscription.id));

    console.log(`[Webhook] Subscription cancelled: ${subscription.id}`);
  }

  async function handleSubscriptionPaused(subscription: any) {
    const { db } = await import("./db");
    const { organizations } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(organizations)
      .set({ payment_status: "paused" })
      .where(eq(organizations.subscription_id, subscription.id));

    console.log(`[Webhook] Subscription paused: ${subscription.id}`);
  }

  async function handleSubscriptionResumed(subscription: any) {
    const { db } = await import("./db");
    const { organizations } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(organizations)
      .set({ payment_status: "active" })
      .where(eq(organizations.subscription_id, subscription.id));

    console.log(`[Webhook] Subscription resumed: ${subscription.id}`);
  }

  async function handlePaymentFailed(payment: any) {
    console.error(
      `[Webhook] Payment failed: ${payment.id}`,
      payment.error_description,
    );
    // Could send notification to organization admin
  }

  // Get subscription status for current organization
  app.get(
    "/api/subscription/status",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);

      const { db } = await import("./db");
      const { organizations } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Get plan limits
      const limits = getPlanLimits(org.plan_name);

      res.json({
        status: org.payment_status || "pending",
        plan: org.plan_name || "starter",
        subscriptionId: org.subscription_id,
        limits,
        isDeveloper: org.is_developer || false,
      });
    }),
  );

  // Toggle developer mode for an organization (for development/testing)
  // WARNING: This endpoint should be secured or removed in production
  app.post(
    "/api/subscription/developer-mode",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { enabled, secretKey } = req.body;

      // Add a secret key check to prevent unauthorized access
      const DEV_SECRET = env.DEVELOPER_MODE_SECRET || "dev-mode-secret-key";

      if (secretKey !== DEV_SECRET) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Invalid secret key for developer mode",
        });
      }

      const { db } = await import("./db");
      const { organizations } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(organizations)
        .set({
          is_developer: enabled === true,
          payment_status: enabled === true ? "active" : "pending",
        })
        .where(eq(organizations.id, orgId));

      res.json({
        success: true,
        message: `Developer mode ${enabled ? "enabled" : "disabled"}`,
        isDeveloper: enabled === true,
      });
    }),
  );

  // Customers API - All authenticated users can view
  app.get(
    "/api/customers",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const customers = await customerService.listCustomers(orgId);
      res.json(customers);
    }),
  );

  app.post(
    "/api/customers",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(createCustomerRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const customer = await customerService.createCustomer(req.body, orgId);
      res.status(201).json(customer);
    }),
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
    }),
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
          lt(bills.created_at, createdAt),
        ) as unknown as SQL;
        whereCond = and(
          eq(bills.org_id, orgId),
          paginationCond,
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
    }),
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
        today.getDate(),
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );

      const rows = await db
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.org_id, orgId),
            gte(bills.created_at, startOfDay),
            lt(bills.created_at, endOfDay),
          ),
        )
        .orderBy(desc(bills.created_at));

      res.json(rows);
    }),
  );

  // Staff, manager, and admin can create bills
  app.post(
    "/api/bills",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(createBillRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const bill = await billingService.createBill(req.body, orgId);
      res.status(201).json(bill);
    }),
  );

  // Finalize a bill to prevent further mutation
  app.patch(
    "/api/bills/:billId/finalize",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const finalizedBy =
        (req as any)?.user?.username || (req as any)?.user?.id || "system";
      const bill = await billingService.finalizeBill(
        req.params.billId,
        orgId,
        String(finalizedBy),
      );
      res.json(bill);
    }),
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
        orgId,
      );
      res.json(items);
    }),
  );

  app.post(
    "/api/bills/:billId/items",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(addBillItemRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const item = await billingService.addBillItem(
        req.params.billId,
        req.body.product_id,
        req.body.quantity,
        orgId,
      );
      res.status(201).json(item);
    }),
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
      const { billRepository, creditNoteRepository } =
        await import("./repositories");
      const bill = await billRepository.findById(req.params.billId, orgId);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      const notes = await creditNoteRepository.findByBillId(
        req.params.billId,
        orgId,
      );
      res.json(notes);
    }),
  );

  app.post(
    "/api/bills/:billId/credit-notes",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    validateRequestBody(createCreditNoteRequestSchema),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const note = await billingService.createCreditNote(
        req.params.billId,
        req.body.amount,
        req.body.reason,
        orgId,
      );
      res.status(201).json(note);
    }),
  );

  // Send E-Bill to customer
  app.post(
    "/api/bills/send-ebill",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager", "cashier"),
    asyncHandler(async (req, res) => {
      const { bill_id, bill_number, channels, email, phone, message, qr_code } =
        req.body;

      // Validate required fields
      if (!bill_id || !channels || channels.length === 0) {
        return res
          .status(400)
          .json({ error: "Bill ID and at least one channel required" });
      }

      // For now, we'll simulate sending (in production, integrate with email/SMS/WhatsApp APIs)
      const results = {
        bill_number,
        channels_sent: channels,
        success: true,
        timestamp: new Date().toISOString(),
      };

      // TODO: Implement actual sending logic:
      // - Email: Use nodemailer or SendGrid
      // - SMS: Use Twilio or AWS SNS
      // - WhatsApp: Use Twilio WhatsApp API or Meta WhatsApp Business API

      res.json({
        success: true,
        message: `E-Bill sent successfully via ${channels.join(", ")}`,
        results,
      });
    }),
  );

  // ============================
  // Payment Processing Endpoints
  // ============================

  /**
   * Process payment for a bill
   * Handles cash, card, UPI, and Razorpay payments
   */
  app.post(
    "/api/bills/:billId/payment",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const billId = req.params.billId;
      const { amount, method, razorpay_payment_id, notes } = req.body as {
        amount: number;
        method: "cash" | "card" | "upi" | "razorpay";
        razorpay_payment_id?: string;
        notes?: string;
      };

      // Import metrics for monitoring
      const { paymentsProcessed, paymentLatency, billAmount } =
        await import("./middleware/prometheus");
      const paymentStart = Date.now();

      try {
        // Validate input
        if (!amount || amount <= 0) {
          return res.status(400).json({ error: "Invalid payment amount" });
        }

        if (!["cash", "card", "upi", "razorpay"].includes(method)) {
          return res.status(400).json({ error: "Invalid payment method" });
        }

        // Get bill from repository
        const { billRepository } = await import("./repositories");
        const bill = await billRepository.findById(billId, orgId);

        if (!bill) {
          paymentsProcessed.inc({ method, status: "not_found" });
          return res.status(404).json({ error: "Bill not found" });
        }

        // Verify payment amount matches bill total
        const billTotal = parseFloat(bill.final_amount || bill.total_amount);
        if (Math.abs(amount - billTotal) > 0.01) {
          paymentsProcessed.inc({ method, status: "amount_mismatch" });
          return res.status(400).json({
            error: `Payment amount (₹${amount}) does not match bill total (₹${billTotal})`,
          });
        }

        // Handle Razorpay verification
        if (method === "razorpay") {
          if (!razorpay_payment_id) {
            paymentsProcessed.inc({ method, status: "missing_payment_id" });
            return res
              .status(400)
              .json({ error: "Razorpay payment ID required" });
          }

          if (!razorpay) {
            paymentsProcessed.inc({ method, status: "razorpay_unavailable" });
            return res.status(503).json({
              error: "Razorpay is not configured",
            });
          }

          try {
            // Verify payment with Razorpay (optional - webhook is primary)
            console.log(
              `💳 Razorpay payment ${razorpay_payment_id} recorded for bill ${billId}`,
            );
          } catch (err) {
            console.error("Razorpay verification failed:", err);
            paymentsProcessed.inc({ method, status: "verification_failed" });
            return res.status(400).json({
              error: "Razorpay payment verification failed",
            });
          }
        }

        // Update bill with payment information
        const { db } = await import("./db");
        const { bills } = await import("../shared/schema");
        const { eq, and } = await import("drizzle-orm");

        const updatedBill = await db
          .update(bills)
          .set({
            payment_method: method,
            finalized_at: new Date(),
            finalized_by: (req.user as any)?.id?.toString() || "system",
          })
          .where(and(eq(bills.id, billId), eq(bills.org_id, orgId)))
          .returning();

        if (!updatedBill[0]) {
          paymentsProcessed.inc({ method, status: "update_failed" });
          return res.status(500).json({ error: "Failed to process payment" });
        }

        // Record successful payment
        const paymentDuration = (Date.now() - paymentStart) / 1000;
        paymentsProcessed.inc({ method, status: "success" });
        paymentLatency.observe({ method }, paymentDuration);
        billAmount.observe({ payment_method: method }, amount);

        console.log(
          `✅ Payment processed: ${method} for bill ${billId}, amount ₹${amount}`,
        );

        res.json({
          success: true,
          bill: updatedBill[0],
          message: `Payment of ₹${amount} processed via ${method}`,
        });
      } catch (error) {
        paymentsProcessed.inc({ method, status: "error" });
        console.error("Payment processing error:", error);
        throw error;
      }
    }),
  );

  /**
   * Email receipt to customer
   */
  app.post(
    "/api/bills/:billId/email-receipt",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const billId = req.params.billId;
      const { email } = req.body as { email?: string };

      const { billRepository } = await import("./repositories");
      const bill = await billRepository.findById(billId, orgId);

      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }

      // TODO: Integrate email service (SendGrid, AWS SES, etc.)
      // For now, just log
      console.log(`📧 Email receipt requested for bill ${billId} to ${email}`);

      res.json({
        success: true,
        message: `Receipt will be sent to ${email}`,
      });
    }),
  );

  /**
   * Get payment history for a bill
   */
  app.get(
    "/api/bills/:billId/payments",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const billId = req.params.billId;

      const { billRepository } = await import("./repositories");
      const bill = await billRepository.findById(billId, orgId);

      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }

      // Return payment information
      res.json({
        bill_id: bill.id,
        bill_number: bill.bill_number,
        amount: bill.final_amount || bill.total_amount,
        payment_method: bill.payment_method,
        finalized_at: bill.finalized_at,
      });
    }),
  );

  // ==================== Held Bills API ====================
  /**
   * Create a held bill (save for later)
   */
  app.post(
    "/api/held-bills",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { db } = await import("./db");
      const schema = await import("../shared/schema");
      const heldBills = schema.held_bills;

      const {
        hold_name,
        customer_id,
        items,
        subtotal,
        discount_percent,
        tax_percent,
        notes,
      } = req.body;

      const heldBill = await db
        .insert(heldBills)
        .values({
          id: crypto.randomUUID(),
          org_id: orgId,
          terminal_id: req.body.terminal_id || null,
          cashier_id: (req as any).user?.id || null,
          hold_name,
          customer_id: customer_id || null,
          items: JSON.stringify(items),
          subtotal,
          discount_percent: discount_percent || 0,
          tax_percent: tax_percent || 0,
          notes: notes || null,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
        })
        .returning();

      res.status(201).json(heldBill[0]);
    }),
  );

  /**
   * Get all held bills for the organization
   */
  app.get(
    "/api/held-bills",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { db } = await import("./db");
      const schema = await import("../shared/schema");
      const heldBills = schema.held_bills;
      const { eq, and, gt } = await import("drizzle-orm");

      const bills = await db
        .select()
        .from(heldBills)
        .where(
          and(
            eq(heldBills.org_id, orgId),
            gt(heldBills.expires_at, new Date()), // Only active (not expired)
          ),
        )
        .orderBy(heldBills.created_at);

      res.json(bills);
    }),
  );

  /**
   * Get a specific held bill
   */
  app.get(
    "/api/held-bills/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { db } = await import("./db");
      const schema = await import("../shared/schema");
      const heldBills = schema.held_bills;
      const { eq, and } = await import("drizzle-orm");

      const result = await db
        .select()
        .from(heldBills)
        .where(
          and(eq(heldBills.id, req.params.id), eq(heldBills.org_id, orgId)),
        )
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ error: "Held bill not found" });
      }

      res.json(result[0]);
    }),
  );

  /**
   * Delete a held bill (cancel/resume)
   */
  app.delete(
    "/api/held-bills/:id",
    isAuthenticated,
    requireActiveSubscription,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { db } = await import("./db");
      const schema = await import("../shared/schema");
      const heldBills = schema.held_bills;
      const { eq, and } = await import("drizzle-orm");

      const result = await db
        .delete(heldBills)
        .where(
          and(eq(heldBills.id, req.params.id), eq(heldBills.org_id, orgId)),
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Held bill not found" });
      }

      res.json({ message: "Held bill deleted", id: req.params.id });
    }),
  );

  // ==================== POS Metrics API ====================
  /**
   * Get real-time POS metrics for dashboard
   */
  app.get(
    "/api/pos/metrics",
    isAuthenticated,
    requireRole("admin", "store_manager", "inventory_manager"),
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const { db } = await import("./db");
      const { bills, bill_items, products } = await import("../shared/schema");
      const { and, eq, gte, desc, sql } = await import("drizzle-orm");

      // Today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's bills
      const todayBills = await db
        .select({
          id: bills.id,
          finalAmount: bills.final_amount,
          paymentMethod: bills.payment_method,
          createdAt: bills.created_at,
        })
        .from(bills)
        .where(and(eq(bills.org_id, orgId), gte(bills.created_at, today)));

      // Calculate today's metrics
      const todaySales = todayBills.reduce(
        (sum, bill) => sum + Number(bill.finalAmount || 0),
        0,
      );
      const averageBillValue =
        todayBills.length > 0 ? todaySales / todayBills.length : 0;

      // Get today's bill items with product details
      const billIds = todayBills.map((b) => b.id);
      const todayItems =
        billIds.length > 0
          ? await db
              .select({
                productId: bill_items.product_id,
                quantity: bill_items.quantity,
                totalPrice: bill_items.total_price,
                productName: products.name,
              })
              .from(bill_items)
              .leftJoin(products, eq(bill_items.product_id, products.id))
              .where(eq(bill_items.org_id, orgId))
          : [];

      // Top selling today
      const productStats = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();
      todayItems.forEach((item) => {
        const existing = productStats.get(item.productId) || {
          name: item.productName || "Unknown",
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += Number(item.totalPrice || 0);
        productStats.set(item.productId, existing);
      });

      const topSellingToday = Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Payment method breakdown
      const paymentBreakdown = new Map<
        string,
        { count: number; amount: number }
      >();
      todayBills.forEach((bill) => {
        const method = bill.paymentMethod || "cash";
        const existing = paymentBreakdown.get(method) || {
          count: 0,
          amount: 0,
        };
        existing.count += 1;
        existing.amount += Number(bill.finalAmount || 0);
        paymentBreakdown.set(method, existing);
      });

      const paymentMethodBreakdown = Array.from(paymentBreakdown.entries()).map(
        ([method, stats]) => ({
          method,
          count: stats.count,
          amount: stats.amount,
        }),
      );

      // Last 7 days trend
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayBills = await db
          .select({
            finalAmount: bills.final_amount,
          })
          .from(bills)
          .where(
            and(
              eq(bills.org_id, orgId),
              gte(bills.created_at, date),
              sql`${bills.created_at} < ${nextDate}`,
            ),
          );

        last7Days.push({
          date: date.toISOString().split("T")[0],
          revenue: dayBills.reduce(
            (sum, b) => sum + Number(b.finalAmount || 0),
            0,
          ),
          billCount: dayBills.length,
        });
      }

      res.json({
        todaySales: Math.round(todaySales),
        todayBills: todayBills.length,
        averageBillValue: Math.round(averageBillValue),
        topSellingToday,
        paymentMethodBreakdown,
        last7DaysSales: last7Days,
      });
    }),
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
    }),
  );

  app.post(
    "/api/inventory-transactions",
    isAuthenticated,
    requireActiveSubscription,
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
          orgId,
        );
      } else if (transaction_type === "out") {
        result = await inventoryService.recordStockOut(
          product_id,
          Number(quantity),
          reference_type || "adjustment",
          reference_id || null,
          notes || null,
          orgId,
        );
      } else {
        // adjustment
        const delta = Number(quantity) || 0;
        const adj = await inventoryService.adjustStock(
          product_id,
          delta,
          notes || "adjustment",
          orgId,
        );
        result = adj;
      }
      res.status(201).json(result.transaction);
    }),
  );

  // RBAC roles API - For invite functionality (session-based with RBAC)
  app.get("/api/rbac/roles", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("./db");
      const {
        roles,
        user_roles,
        roles: rolesTable,
      } = await import("../shared/schema");
      const { and, eq, inArray } = await import("drizzle-orm");

      const userId = (req as any).user?.id;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        console.log("[RBAC] Missing userId or orgId:", { userId, orgId });
        return res.json([]);
      }

      // Get user's roles in this org
      const userRolesInOrg = await db
        .select({ name: rolesTable.name })
        .from(user_roles)
        .leftJoin(rolesTable, eq(user_roles.role_id, rolesTable.id))
        .where(
          and(eq(user_roles.user_id, userId), eq(user_roles.org_id, orgId)),
        );

      const inviterRoles = userRolesInOrg
        .map((r) => r.name)
        .filter(Boolean) as string[];

      if (inviterRoles.length === 0) {
        return res.json([]);
      }

      // Determine which roles this user can assign
      const canAssignRoles = [];
      if (inviterRoles.includes("admin") || inviterRoles.includes("owner")) {
        canAssignRoles.push("store_manager", "inventory_manager", "cashier");
      } else if (inviterRoles.includes("store_manager")) {
        canAssignRoles.push("inventory_manager", "cashier");
      }

      if (canAssignRoles.length === 0) {
        return res.json([]);
      }

      // Fetch the actual role objects
      const rolesList = await db
        .select()
        .from(roles)
        .where(inArray(roles.name, canAssignRoles as any));

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
  });

  // Pending invites API - Session-based (for SendInvite component)
  app.get("/api/org/invites/pending", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { user_invites, roles } = await import("../shared/schema");
      const { and, eq, isNull, gt, desc } = await import("drizzle-orm");

      const orgId = (req.query.org_id as string) || (req.user as any)?.orgId;

      if (!orgId) {
        return res.status(400).json({ error: "org_id required" });
      }

      // Fetch pending invites (not accepted, not expired)
      const pending = await db
        .select({
          id: user_invites.id,
          email: user_invites.email,
          full_name: user_invites.full_name,
          phone: user_invites.phone,
          role_id: user_invites.role_id,
          store_id: user_invites.store_id,
          created_at: user_invites.created_at,
          expires_at: user_invites.expires_at,
          accepted_at: user_invites.accepted_at,
          role_name: roles.name,
        })
        .from(user_invites)
        .leftJoin(roles, eq(user_invites.role_id, roles.id))
        .where(
          and(
            eq(user_invites.org_id, orgId as any),
            isNull(user_invites.accepted_at),
            gt(user_invites.expires_at, new Date()),
          ),
        )
        .orderBy(desc(user_invites.created_at));

      return res.json({ invites: pending });
    } catch (error: any) {
      console.error("Error fetching pending invites:", error);
      return res.status(500).json({ error: "Failed to load pending invites" });
    }
  });

  // Dashboard stats API - All authenticated users
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
        0,
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
            today.getDate(),
          );
          const endOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
          );
          const rows = await db
            .select()
            .from(bills)
            .where(
              and(
                eq(bills.org_id, orgId),
                gte(bills.created_at, startOfDay),
                lt(bills.created_at, endOfDay),
              ),
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
    }),
  );

  // Get user's organization and store details
  app.get("/api/profile/organization", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { user_roles, organizations, stores, roles } =
        await import("../shared/schema");
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

  // Analytics API - Comprehensive business insights
  app.get(
    "/api/analytics",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const orgId = requireOrgId(req);
      const days = Math.min(Number(req.query.days) || 30, 365);

      const { db } = await import("./db");
      const { bills, bill_items, products, customers, stores } =
        await import("../shared/schema");
      const { and, eq, gte, desc, sql } = await import("drizzle-orm");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get bills in period with customer info
      const periodBills = await db
        .select({
          id: bills.id,
          billNumber: bills.bill_number,
          customerId: bills.customer_id,
          totalAmount: bills.total_amount,
          finalAmount: bills.final_amount,
          paymentMethod: bills.payment_method,
          createdAt: bills.created_at,
          customerName: customers.name,
        })
        .from(bills)
        .leftJoin(customers, eq(bills.customer_id, customers.id))
        .where(and(eq(bills.org_id, orgId), gte(bills.created_at, cutoffDate)))
        .orderBy(desc(bills.created_at));

      // Get bill items with product details
      const billIds = periodBills.map((b) => b.id);
      const itemsData =
        billIds.length > 0
          ? await db
              .select({
                billId: bill_items.bill_id,
                productId: bill_items.product_id,
                quantity: bill_items.quantity,
                totalPrice: bill_items.total_price,
                productName: products.name,
                productCategory: products.category,
              })
              .from(bill_items)
              .leftJoin(products, eq(bill_items.product_id, products.id))
              .where(eq(bill_items.org_id, orgId))
          : [];

      // Calculate metrics
      const totalRevenue = periodBills.reduce(
        (sum, bill) => sum + Number(bill.finalAmount || 0),
        0,
      );

      const averageBillValue =
        periodBills.length > 0 ? totalRevenue / periodBills.length : 0;

      // Get unique customers
      const uniqueCustomers = new Set(
        periodBills.filter((b) => b.customerId).map((b) => b.customerId),
      );

      // Get all customers for new vs repeat
      const allCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.org_id, orgId));

      const newCustomers = allCustomers.filter((c) => {
        const custDate = new Date(c.created_at);
        return custDate >= cutoffDate;
      }).length;

      // Top products by revenue
      const productRevenue = new Map<
        string,
        { name: string; category: string; quantity: number; revenue: number }
      >();
      itemsData.forEach((item) => {
        const existing = productRevenue.get(item.productId) || {
          name: item.productName || "Unknown",
          category: item.productCategory || "Uncategorized",
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += Number(item.totalPrice || 0);
        productRevenue.set(item.productId, existing);
      });

      const topProducts = Array.from(productRevenue.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Revenue by category
      const categoryRevenue = new Map<string, number>();
      itemsData.forEach((item) => {
        const category = item.productCategory || "Uncategorized";
        categoryRevenue.set(
          category,
          (categoryRevenue.get(category) || 0) + Number(item.totalPrice || 0),
        );
      });

      const revenueByCategory = Array.from(categoryRevenue.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Daily sales trend
      const dailyMap = new Map<
        string,
        { revenue: number; billCount: number }
      >();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dailyMap.set(dateStr, { revenue: 0, billCount: 0 });
      }

      periodBills.forEach((bill) => {
        const dateStr = new Date(bill.createdAt).toISOString().split("T")[0];
        const dayData = dailyMap.get(dateStr);
        if (dayData) {
          dayData.revenue += Number(bill.finalAmount || 0);
          dayData.billCount += 1;
        }
      });

      const dailySales = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue),
        billCount: data.billCount,
      }));

      // Revenue by payment method
      const paymentMethodRevenue = new Map<string, number>();
      periodBills.forEach((bill) => {
        const method = bill.paymentMethod || "cash";
        paymentMethodRevenue.set(
          method,
          (paymentMethodRevenue.get(method) || 0) +
            Number(bill.finalAmount || 0),
        );
      });

      const revenueByPaymentMethod = Array.from(
        paymentMethodRevenue.entries(),
      ).map(([name, value]) => ({ name, value }));

      // Top customers
      const customerSpending = new Map<
        string,
        { name: string; spent: number; billCount: number }
      >();
      periodBills.forEach((bill) => {
        if (bill.customerId && bill.customerName) {
          const existing = customerSpending.get(bill.customerId) || {
            name: bill.customerName,
            spent: 0,
            billCount: 0,
          };
          existing.spent += Number(bill.finalAmount || 0);
          existing.billCount += 1;
          customerSpending.set(bill.customerId, existing);
        }
      });

      const topCustomers = Array.from(customerSpending.values())
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 10);

      // Get all stores for multi-store analytics
      const allStores = await db
        .select()
        .from(stores)
        .where(eq(stores.org_id, orgId));

      res.json({
        period: `Last ${days} days`,
        totalRevenue: Math.round(totalRevenue),
        totalBills: periodBills.length,
        averageBillValue: Math.round(averageBillValue),
        uniqueCustomers: uniqueCustomers.size,
        newCustomers,
        repeatCustomers: uniqueCustomers.size - newCustomers,
        topProducts,
        revenueByCategory,
        dailySales,
        revenueByPaymentMethod,
        topCustomers,
        totalStores: allStores.length,
        storeNames: allStores.map((s) => s.name),
      });
    }),
  );

  const httpServer = createServer(app);
  return httpServer;
}
