import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupAuthRoutes } from "./authRoutes";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerJwtRoutes } from "./routes.jwt";

// Load environment-specific .env file
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`📋 Loading environment from: ${envFile}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔐 SESSION_SECURE: ${process.env.SESSION_SECURE}`);
console.log(`🍪 SESSION_SAME_SITE: ${process.env.SESSION_SAME_SITE}`);

const app = express();

// Trust proxy for proper session handling
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security middlewares
const isDev = app.get("env") === "development";
app.use(
  helmet({
    // In dev, disable CSP so Vite/react-refresh inline preambles and overlays can run
    contentSecurityPolicy: isDev ? false : undefined,
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

  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    res
      .status(status)
      .json({ message: err.message || "Internal Server Error" });
  });

  // Serve static files or use Vite in dev mode
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
