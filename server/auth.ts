import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "./db";
import { users, user_roles, stores } from "../shared/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import { env, isProduction } from "./config/env";

const SALT_ROUNDS = 10;

// Verify password using bcrypt
function verifyPassword(
  inputPassword: string,
  storedPassword: string
): boolean {
  return bcrypt.compareSync(inputPassword, storedPassword);
}

// Hash password using bcrypt
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }

      if (!user.is_active) {
        return done(null, false, { message: "Account is deactivated" });
      }

      const isValidPassword = verifyPassword(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: "Invalid username or password" });
      }

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      return done(error);
    }
  })
);

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return done(null, false);
    }

    // Fetch organization and store assignments
    const [assignment] = await db
      .select()
      .from(user_roles)
      .where(eq(user_roles.user_id, user.id))
      .limit(1);

    const { password: _, ...userWithoutPassword } = user;

    // Determine default store when user has org assignment but no store assignment
    let derivedStoreId: string | undefined = assignment?.store_id || undefined;
    if (assignment?.org_id && !derivedStoreId) {
      try {
        const [defaultStore] = await db
          .select()
          .from(stores)
          .where(eq(stores.org_id, assignment.org_id))
          .limit(1);
        derivedStoreId = defaultStore?.id;
      } catch (e) {
        // swallow; we'll proceed without a storeId if lookup fails
      }
    }

    // Attach org and store context to user object
    const userWithContext = {
      ...userWithoutPassword,
      orgId: assignment?.org_id,
      storeId: derivedStoreId,
    };

    console.log("[AUTH] Deserialized user:", {
      id: userWithContext.id,
      username: userWithContext.username,
      orgId: userWithContext.orgId,
      storeId: userWithContext.storeId,
      hasAssignment: !!assignment,
    });

    done(null, userWithContext);
  } catch (error) {
    console.error("[AUTH] Error deserializing user:", error);
    done(error);
  }
});

// Setup authentication middleware
export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  // Determine if we should mark cookies as secure:
  // Use validated env var SESSION_SECURE but automatically disable on localhost/127.0.0.1 when not behind HTTPS.
  const host = process.env.HOST || "127.0.0.1";
  const runningOnLocalHost = /^(localhost|127\.0\.0\.1)$/.test(host);
  const secureCookie = env.SESSION_SECURE && !runningOnLocalHost;
  const sameSite = env.SESSION_SAME_SITE;

  // Session middleware
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000,
      }),
      cookie: {
        maxAge: Number(env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000,
        httpOnly: env.SESSION_HTTP_ONLY,
        secure: secureCookie,
        sameSite: sameSite,
        ...(isProduction &&
          env.SESSION_SECURE &&
          env.SESSION_SAME_SITE === "none" && { secure: true }),
        ...(isProduction &&
          process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Middleware to check user role
export function hasRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to access this resource",
      });
    }

    next();
  };
}

// Helper functions
export { hashPassword, verifyPassword };
