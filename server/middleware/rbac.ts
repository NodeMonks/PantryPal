import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../../shared/schema";
import type { ErrorResponse } from "../models/dtos";

/**
 * Role-based access control middleware
 * Verifies user has one of the required roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      };
      return res.status(401).json(errorResponse);
    }

    const userRole = user.role as UserRole;

    if (!roles.includes(userRole)) {
      const errorResponse: ErrorResponse = {
        error: `Insufficient permissions. Required roles: ${roles.join(", ")}`,
        code: "INSUFFICIENT_PERMISSIONS",
      };
      return res.status(403).json(errorResponse);
    }

    next();
  };
};

/**
 * Check if user has admin role
 */
export const isAdmin = (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user?.role !== "admin" && user?.role !== "store_manager") {
    throw new Error("Admin access required");
  }
  next();
};

/**
 * Check if user has manager role
 */
export const isManager = (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const allowedRoles = ["admin", "store_manager", "inventory_manager"];
  if (!allowedRoles.includes(user?.role)) {
    throw new Error("Manager access required");
  }
  next();
};

/**
 * Check if user has cashier role (can process sales)
 */
export const isCashier = (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const allowedRoles = ["admin", "store_manager", "cashier"];
  if (!allowedRoles.includes(user?.role)) {
    throw new Error("Cashier access required");
  }
  next();
};

/**
 * Permission check for specific operations
 * Can be extended to check database permission table
 */
export const requirePermission = (permission: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // TODO: Check against user_roles and role_permissions tables
    // For now, just pass through - admin can do everything
    next();
  };
};
