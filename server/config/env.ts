import { z } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Environment variable validation schema using Zod
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("5000"),
  HOST: z.string().default("127.0.0.1"),
  APP_BASE_URL: z.string().url().default("http://localhost:5000"),

  // Database
  DATABASE_URL: z.string().url().startsWith("postgresql://"),

  // Authentication & Security
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .default("test-session-secret-min-32-chars-long-for-testing"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters")
    .default("test-jwt-access-secret-min-32-chars-long-for-testing"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
    .default("test-jwt-refresh-secret-min-32-chars-long-for-testing"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  SESSION_MAX_AGE: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("86400000"),

  // Session Security (Production)
  SESSION_SECURE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  SESSION_HTTP_ONLY: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  SESSION_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),

  // Email Configuration (Optional in test environment)
  SMTP_HOST: z.string().default("smtp.test.com"),
  SMTP_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("587"),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  SMTP_USER: z.string().default("test@test.com"),
  SMTP_PASS: z.string().default("test"),
  EMAIL_FROM: z.string().default("noreply@test.com"),
  EMAIL_REPLY_TO: z.string().email().optional(),

  // SMS Configuration (Optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  // Accept empty string or valid E.164; treat empty as undefined
  TWILIO_PHONE_NUMBER: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .optional()
    .refine(
      (v) => !v || /^\+[1-9]\d{1,14}$/.test(v),
      "TWILIO_PHONE_NUMBER must be E.164 format (+123...)",
    ),

  // Feature Flags
  ENABLE_SMS_INVITES: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  ENABLE_EMAIL_INVITES: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  ENABLE_AUDIT_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  ENABLE_QR_SCANNER: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // Security & Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("900000"),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("100"),
  CORS_ORIGINS: z.string().default("http://localhost:5000"),
  HELMET_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  DB_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  SLOW_QUERY_THRESHOLD_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("300"),
  SILENT_LOGS: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Redis (Optional - for session store)
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  SESSION_STORE: z.enum(["memory", "postgres", "redis"]).default("postgres"),

  // Monitoring (Optional)
  SENTRY_DSN: z.string().url().optional(),

  // Development Tools (Optional)
  VITE_HMR_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional(),
  VITE_HMR_PROTOCOL: z.enum(["ws", "wss"]).optional(),

  // Payments (Optional - Razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_STARTER_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ID_PREMIUM_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ID_PROFESSIONAL_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ID_ENTERPRISE_MONTHLY: z.string().optional(),
  SUBSCRIPTION_DEFAULT_PLAN: z.string().default("starter-monthly"),

  // Developer Mode (for testing/development)
  DEVELOPER_MODE_SECRET: z
    .string()
    .min(16, "DEVELOPER_MODE_SECRET must be at least 16 characters")
    .default("dev-mode-secret-key-change-me"),
});

/**
 * Parsed and validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed configuration
 * Throws detailed error if validation fails
 */
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error, {
        prefix: "Environment validation failed",
        prefixSeparator: ":\n",
        issueSeparator: "\n  - ",
      });
      throw new Error(validationError.message);
    }
    throw error;
  }
}

/**
 * Validated environment configuration
 * Import this in your application code instead of process.env
 */
export const env = validateEnv();

/**
 * Helper to check if running in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Helper to check if running in development
 */
export const isDevelopment = env.NODE_ENV === "development";

/**
 * Helper to check if running in test
 */
export const isTest = env.NODE_ENV === "test";

/**
 * Parse CORS origins into array
 */
export const getCorsOrigins = (): string[] => {
  return env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
};

/**
 * Check if SMS is configured and enabled
 */
export const isSmsEnabled = (): boolean => {
  return (
    env.ENABLE_SMS_INVITES &&
    !!env.TWILIO_ACCOUNT_SID &&
    !!env.TWILIO_AUTH_TOKEN &&
    !!env.TWILIO_PHONE_NUMBER
  );
};

/**
 * Check if Redis is configured
 */
export const isRedisEnabled = (): boolean => {
  return !!env.REDIS_URL;
};

/**
 * Get database configuration with pooling settings
 */
export const getDatabaseConfig = () => {
  return {
    connectionString: env.DATABASE_URL,
    max: isProduction ? 10 : 5,
    min: isProduction ? 2 : 1,
    idleTimeoutMillis: 10000,
    ssl: isProduction ? { rejectUnauthorized: true } : false,
  };
};

/**
 * Example usage in your application:
 *
 * import { env, isProduction, getCorsOrigins } from './config/env';
 *
 * // Use typed env instead of process.env
 * const port = env.PORT;
 * const dbUrl = env.DATABASE_URL;
 *
 * // Use helpers
 * if (isProduction) {
 *   // Production-specific logic
 * }
 *
 * app.use(cors({ origin: getCorsOrigins() }));
 */
