import type { Request, Response, NextFunction } from "express";
import type { ErrorResponse } from "../models/dtos";
import * as Sentry from "@sentry/node";

/**
 * Structured logger for consistent error/info logging with context
 */
export const logger = {
  error: (message: string, context?: Record<string, any>) => {
    const logEntry = {
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.error(JSON.stringify(logEntry));
    if (process.env.SENTRY_DSN && context?.error instanceof Error) {
      Sentry.captureException(context.error, {
        level: "error",
        contexts: { request: context },
      });
    }
  },
  warn: (message: string, context?: Record<string, any>) => {
    const logEntry = {
      level: "warn",
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.warn(JSON.stringify(logEntry));
  },
  info: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV !== "production") {
      const logEntry = {
        level: "info",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      };
      console.log(JSON.stringify(logEntry));
    }
  },
};

export class AppError extends Error {
  constructor(
    public statusCode: number = 500,
    message: string,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Global error handler middleware
 * Handles all errors and ensures consistent error responses
 * IMPORTANT: Include org_id and user context in error logging
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Extract context for logging
  const user = (req as any).user;
  const orgId = (req as any).orgId;
  const requestId = (req as any).requestId || "unknown";

  // Default error status and code
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "An unexpected error occurred";

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err instanceof Error) {
    // Handle specific error types
    if (err.message.includes("not found")) {
      statusCode = 404;
      code = "NOT_FOUND";
      message = err.message;
    } else if (err.message.includes("Insufficient")) {
      statusCode = 409;
      code = "CONFLICT";
      message = err.message;
    } else if (
      err.message.includes("immutable") ||
      err.message.includes("finalized")
    ) {
      statusCode = 409;
      code = "IMMUTABLE_RESOURCE";
      message = err.message;
    } else {
      message = err.message;
    }
  }

  // Log error with structured context
  logger.error(message, {
    requestId,
    orgId: orgId || "unknown",
    userId: user?.id || "anonymous",
    path: req.path,
    method: req.method,
    statusCode,
    code,
    stack: err instanceof Error ? err.stack : undefined,
    error: err,
  });

  // Send error response
  const errorResponse: ErrorResponse = {
    error: message,
    code,
  };

  // In development, include stack trace; in production, be vague
  if (process.env.NODE_ENV === "development") {
    errorResponse.details = err instanceof Error ? err.stack : undefined;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async route handler wrapper to catch and pass errors to error handler
 * Logs handler execution for observability
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    Promise.resolve(fn(req, res, next))
      .then(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          logger.warn(`Slow request: ${req.method} ${req.path}`, {
            duration,
            orgId: (req as any).orgId,
          });
        }
      })
      .catch((err) => {
        logger.error(`Handler error: ${req.method} ${req.path}`, {
          error: err,
          orgId: (req as any).orgId,
          duration: Date.now() - start,
        });
        next(err);
      });
  };
