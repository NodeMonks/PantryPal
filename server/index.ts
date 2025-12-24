import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupAuthRoutes } from "./authRoutes";
import qrRoutes from "./routes/qrRoutes";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerJwtRoutes } from "./routes.jwt";
import { db } from "./db";
import { sessions } from "../shared/schema";
import { lt } from "drizzle-orm";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { errorHandler } from "./middleware/errorHandler";

// Load environment-specific .env file
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`📋 Loading environment from: ${envFile}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔐 SESSION_SECURE: ${process.env.SESSION_SECURE}`);
console.log(`🍪 SESSION_SAME_SITE: ${process.env.SESSION_SAME_SITE}`);

const app = express();

// Initialize Sentry if DSN provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    integrations: [
      nodeProfilingIntegration(),
      // HTTP integration enables automatic instrumentation of outgoing requests
      Sentry.httpIntegration(),
      // Express integration enables request tracing and spans for handlers
      Sentry.expressIntegration(),
    ],
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"
    ),
    profilesSampleRate: parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || "0.05"
    ),
  });
}

// Trust proxy for proper session handling
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security middlewares
const isDev = app.get("env") === "development";
app.use(
  helmet({
    // In dev, disable CSP so Vite/react-refresh inline preambles and overlays can run
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://checkout.razorpay.com"],
            scriptSrcElem: ["'self'", "https://checkout.razorpay.com"],
            frameSrc: [
              "'self'",
              "https://api.razorpay.com",
              "https://checkout.razorpay.com",
            ],
            connectSrc: [
              "'self'",
              "https://lumberjack.razorpay.com",
              "https://api.razorpay.com",
              "https://checkout.razorpay.com",
            ],
            // Add other directives as needed
          },
        },
    crossOriginEmbedderPolicy: isDev ? false : undefined,
  })
);
app.use(
  cors({
    origin: (
      _origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void
    ) => cb(null, true), // adjust to explicit origins in production
    credentials: true,
  })
);
app.use(cookieParser());

const scheduleSessionCleanup = () => {
  const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  const runCleanup = async () => {
    try {
      const now = new Date();
      await db.delete(sessions).where(lt(sessions.expires_at, now));
      log("🧹 Cleaned up expired sessions");
    } catch (err) {
      console.error("❌ Session cleanup failed", err);
    }
  };

  // Run immediately and then on interval
  runCleanup();
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);
};

// Setup authentication (must be before routes)
setupAuth(app);

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Setup auth routes first
  setupAuthRoutes(app);
  // Setup JWT-based routes (new)
  registerJwtRoutes(app);
  // Setup QR code routes
  app.use(qrRoutes);

  const server = await registerRoutes(app);

  // Cleanup expired sessions periodically
  scheduleSessionCleanup();

  // Global error handler (structured, consistent)
  app.use(errorHandler);

  // Serve static files or use Vite in dev mode
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Sentry error handler should be after all routes and middleware
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.expressErrorHandler());
  }

  // Use dynamic host/port
  const PORT = parseInt(process.env.PORT || "5000", 10);
  const HOST = process.env.HOST || "127.0.0.1";

  try {
    server.listen(PORT, HOST, () => {
      log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    log(`❌ Cannot bind to ${HOST}:${PORT}, trying localhost`);
    server.listen(PORT, () => {
      log(`🚀 Server running on http://localhost:${PORT}`);
    });
  }
})();
