import type { Express } from "express";
import passport from "passport";
import { db } from "./db";
import { users } from "../shared/schema";
import { user_roles } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, isAuthenticated, hasRole } from "./auth";
import { requireOrgId } from "./middleware/tenantContext";
import { registerSchema, loginSchema } from "../shared/schema";

export function setupAuthRoutes(app: Express) {
  // Register new user (admin only for creating other users)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, validatedData.username))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password (in production, use bcrypt)
      const hashedPassword = hashPassword(validatedData.password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          ...validatedData,
          password: hashedPassword,
        })
        .returning();

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        message: "User registered successfully",
        user: userWithoutPassword,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({
        error: "Registration failed",
        details: error.message,
      });
    }
  });

  // Register organization + initial admin + stores
  // Used by external microservice after payment/verification
  app.post("/api/auth/register-organization", async (req, res) => {
    const {
      organizationRegistrationSchema,
      organizations,
      stores,
      users,
      user_roles,
      roles,
    } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    try {
      const parsed = organizationRegistrationSchema.parse(req.body);

      // Basic uniqueness checks for username/email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, parsed.admin.username))
        .limit(1);
      if (existingUser.length) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, parsed.admin.email))
        .limit(1);
      if (existingEmail.length) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Create organization with vendor details
      const vendor = req.body.vendorDetails || {};
      const [org] = await db
        .insert(organizations)
        .values({
          name: parsed.organization.name,
          gst_number: vendor.gst_number || null,
          owner_name: vendor.owner_name || null,
          owner_phone: vendor.owner_phone || null,
          owner_email: vendor.owner_email || null,
          msme_number: vendor.msme_number || null,
          business_address: vendor.business_address || null,
          business_city: vendor.business_city || null,
          business_state: vendor.business_state || null,
          business_pin: vendor.business_pin || null,
          kyc_status: "pending", // Requires admin verification
          payment_status: "pending", // Set from Razorpay webhook later
        })
        .returning();

      // Create stores
      const storeInserts = parsed.stores.map((s) => ({
        name: s.name,
        org_id: org.id,
      }));
      let createdStores: any[] = [];
      if (storeInserts.length) {
        createdStores = await db
          .insert(stores)
          .values(storeInserts)
          .returning();
      }

      // Find store_owner role (fallback to admin if missing)
      const storeOwnerRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "store_owner"))
        .limit(1);
      const adminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "admin"))
        .limit(1);
      const chosenRole = storeOwnerRole[0] || adminRole[0];
      if (!chosenRole) {
        return res
          .status(500)
          .json({ error: "Required role not seeded (store_owner/admin)" });
      }

      // Create admin user
      const hashedPassword = hashPassword(parsed.admin.password);
      const [adminUser] = await db
        .insert(users)
        .values({
          username: parsed.admin.username,
          email: parsed.admin.email,
          password: hashedPassword,
          full_name: parsed.admin.full_name,
          phone: parsed.admin.phone || null,
          role: "admin",
          is_active: true,
        })
        .returning();

      // Link user to org & first store
      const firstStore = createdStores[0];
      await db.insert(user_roles).values({
        user_id: adminUser.id,
        org_id: org.id,
        store_id: firstStore ? firstStore.id : null,
        role_id: chosenRole.id,
      });

      res.status(201).json({
        message: "Organization registered successfully",
        organization: { id: org.id, name: org.name },
        stores: createdStores.map((s) => ({ id: s.id, name: s.name })),
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
        },
      });
    } catch (error: any) {
      console.error("Organization registration error:", error);
      res.status(400).json({
        error: "Organization registration failed",
        details: error.message,
      });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    const preSessionId = (req as any).sessionID;
    console.log("[AUTH] Incoming login, sessionID before auth:", preSessionId);
    try {
      loginSchema.parse(req.body);
    } catch (error: any) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.message,
      });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!user) {
        return res.status(401).json({
          error: info?.message || "Invalid credentials",
        });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        const postSessionId = (req as any).sessionID;
        console.log(
          "[AUTH] Login successful, sessionID after auth:",
          postSessionId
        );
        console.log("[AUTH] Cookie settings:", req.session?.cookie);
        res.json({
          message: "Login successful",
          user,
          sessionId: postSessionId,
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", isAuthenticated, (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    const sid = (req as any).sessionID;
    res.json({ user: req.user, sessionId: sid });
  });

  // Debug session route
  app.get("/api/auth/debug-session", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated?.() || false,
      sessionId: (req as any).sessionID,
      session: {
        cookie: req.session?.cookie,
        data: req.session,
      },
      user: req.user || null,
    });
  });

  // Get current org id for the logged-in (session) user
  app.get("/api/org/current", isAuthenticated, async (req, res) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser?.id) return res.json({ orgId: null });
      const rows = await db
        .select({ org_id: user_roles.org_id })
        .from(user_roles)
        .where(eq(user_roles.user_id, sessionUser.id))
        .limit(1);
      const orgId = rows[0]?.org_id ?? null;
      res.json({ orgId });
    } catch (err) {
      console.error("/api/org/current error", err);
      res.status(500).json({ error: "Failed to fetch current org" });
    }
  });

  // Get all users in the same organization (admin only)
  app.get(
    "/api/auth/users",
    isAuthenticated,
    hasRole("admin"),
    async (req, res) => {
      try {
        // Resolve organization ID from auth context (session or JWT)
        const orgId = requireOrgId(req);

        // Get all users who belong to the same organization
        // by joining with user_roles table
        const orgUsers = await db
          .selectDistinct({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            full_name: users.full_name,
            phone: users.phone,
            is_active: users.is_active,
            created_at: users.created_at,
          })
          .from(users)
          .innerJoin(user_roles, eq(user_roles.user_id, users.id))
          .where(eq(user_roles.org_id, orgId));

        res.json(orgUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
      }
    }
  );

  // Update user role (admin only)
  app.patch(
    "/api/auth/users/:id/role",
    isAuthenticated,
    hasRole("admin"),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        if (
          !["admin", "store_manager", "inventory_manager", "cashier"].includes(
            role
          )
        ) {
          return res.status(400).json({ error: "Invalid role" });
        }

        const [updatedUser] = await db
          .update(users)
          .set({ role, updated_at: new Date() })
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({
          message: "User role updated successfully",
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ error: "Failed to update user role" });
      }
    }
  );

  // Deactivate user (admin only)
  app.patch(
    "/api/auth/users/:id/deactivate",
    isAuthenticated,
    hasRole("admin"),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        const [updatedUser] = await db
          .update(users)
          .set({ is_active: false, updated_at: new Date() })
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deactivated successfully" });
      } catch (error) {
        console.error("Error deactivating user:", error);
        res.status(500).json({ error: "Failed to deactivate user" });
      }
    }
  );

  // Activate user (admin only)
  app.patch(
    "/api/auth/users/:id/activate",
    isAuthenticated,
    hasRole("admin"),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        const [updatedUser] = await db
          .update(users)
          .set({ is_active: true, updated_at: new Date() })
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User activated successfully" });
      } catch (error) {
        console.error("Error activating user:", error);
        res.status(500).json({ error: "Failed to activate user" });
      }
    }
  );
}
