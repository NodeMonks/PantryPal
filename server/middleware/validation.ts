import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import type { ErrorResponse } from "../models/dtos";

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateRequestBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err: any) {
      const errorResponse: ErrorResponse = {
        error: "Validation error",
        details: err.errors?.[0]?.message || err.message,
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(errorResponse);
    }
  };
};

/**
 * Middleware to validate request query against a Zod schema
 */
export const validateRequestQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (err: any) {
      const errorResponse: ErrorResponse = {
        error: "Query validation error",
        details: err.errors?.[0]?.message || err.message,
        code: "QUERY_VALIDATION_ERROR",
      };
      res.status(400).json(errorResponse);
    }
  };
};

/**
 * Middleware to validate request params against a Zod schema
 */
export const validateRequestParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (err: any) {
      const errorResponse: ErrorResponse = {
        error: "Parameter validation error",
        details: err.errors?.[0]?.message || err.message,
        code: "PARAM_VALIDATION_ERROR",
      };
      res.status(400).json(errorResponse);
    }
  };
};
