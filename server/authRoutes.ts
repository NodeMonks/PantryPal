import type { Express } from "express";
import passport from "passport";
import { db } from "./db";
import { users } from "../shared/schema";
import { user_roles } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, isAuthenticated, hasRole } from "./auth";
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

  // Get all users (admin only)
  app.get(
    "/api/auth/users",
    isAuthenticated,
    hasRole("admin"),
    async (req, res) => {
      try {
        const allUsers = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            full_name: users.full_name,
            phone: users.phone,
            is_active: users.is_active,
            created_at: users.created_at,
          })
          .from(users);

        res.json(allUsers);
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
