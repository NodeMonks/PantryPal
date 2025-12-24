import { z } from "zod";

// ============ PRODUCT DTOs ============

export const batchSchema = z.object({
  batch_id: z.string().uuid().optional(),
  batch_number: z.string().min(1, "Batch number is required"),
  arrival_date: z.string().datetime(),
  expiry_date: z.string().datetime().optional(),
  quantity: z.number().int().nonnegative(),
  shelf_location: z.string().optional(),
  barcode: z.string().optional(),
  qr_code: z.string().optional(),
});

export const createProductRequestSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  qr_code: z.string().optional(),
  qr_code_image: z.string().optional(),
  mrp: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v)),
  buying_cost: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v)),
  manufacturing_date: z.string().datetime().optional(),
  expiry_date: z.string().datetime().optional(),
  quantity_in_stock: z.number().int().nonnegative().default(0),
  min_stock_level: z.number().int().nonnegative().default(5),
  unit: z.string().default("piece"),
  description: z.string().optional(),
  batches: z.array(batchSchema).optional(),
});

export const updateProductRequestSchema = createProductRequestSchema.partial();

export const searchProductRequestSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type SearchProductRequest = z.infer<typeof searchProductRequestSchema>;

// ============ CUSTOMER DTOs ============

export const createCustomerRequestSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const updateCustomerRequestSchema =
  createCustomerRequestSchema.partial();

export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerRequestSchema>;

// ============ BILL DTOs ============

export const createBillRequestSchema = z.object({
  bill_number: z.string().min(1, "Bill number is required"),
  customer_id: z.string().uuid().optional(),
  discount_amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .default(0),
  tax_amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .default(0),
  payment_method: z.enum(["cash", "card", "check", "digital"]).default("cash"),
});

export const addBillItemRequestSchema = z.object({
  product_id: z.string().uuid("Product ID must be a valid UUID"),
  quantity: z.number().int().positive("Quantity must be positive"),
});

export const finalizeBillRequestSchema = z.object({
  total_amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v)),
  final_amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v)),
});

export const createCreditNoteRequestSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .refine((val) => val > 0, "Credit note amount must be positive"),
  reason: z.string().min(1, "Reason is required"),
});

export type CreateBillRequest = z.infer<typeof createBillRequestSchema>;
export type AddBillItemRequest = z.infer<typeof addBillItemRequestSchema>;
export type FinalizeBillRequest = z.infer<typeof finalizeBillRequestSchema>;
export type CreateCreditNoteRequest = z.infer<
  typeof createCreditNoteRequestSchema
>;

// ============ INVENTORY DTOs ============

export const recordStockInRequestSchema = z.object({
  product_id: z.string().uuid("Product ID must be a valid UUID"),
  batch_number: z.string().min(1, "Batch number is required"),
  arrival_date: z.string().datetime(),
  expiry_date: z.string().datetime().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  shelf_location: z.string().optional(),
  barcode: z.string().optional(),
  qr_code: z.string().optional(),
  reference_type: z.enum(["purchase", "adjustment", "return"]),
  reference_id: z.string().optional(),
  notes: z.string().optional(),
});

export const recordStockOutRequestSchema = z.object({
  product_id: z.string().uuid("Product ID must be a valid UUID"),
  quantity: z.number().int().positive("Quantity must be positive"),
  reference_type: z.enum(["sale", "damage", "adjustment", "expired"]),
  reference_id: z.string().optional(),
  notes: z.string().optional(),
});

export const adjustStockRequestSchema = z.object({
  product_id: z.string().uuid("Product ID must be a valid UUID"),
  delta: z
    .number()
    .int()
    .refine((val) => val !== 0, "Adjustment delta cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
});

export type RecordStockInRequest = z.infer<typeof recordStockInRequestSchema>;
export type RecordStockOutRequest = z.infer<typeof recordStockOutRequestSchema>;
export type AdjustStockRequest = z.infer<typeof adjustStockRequestSchema>;

// ============ RESPONSE DTOs ============

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  qr_code: z.string().nullable(),
  mrp: z.number(),
  buying_cost: z.number(),
  manufacturing_date: z.string().datetime().nullable(),
  expiry_date: z.string().datetime().nullable(),
  quantity_in_stock: z.number().nullable(),
  min_stock_level: z.number().nullable(),
  unit: z.string(),
  is_active: z.boolean(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  batches: z.array(batchSchema).optional(),
});

export const billResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  bill_number: z.string(),
  customer_id: z.string().uuid().nullable(),
  total_amount: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  final_amount: z.number(),
  payment_method: z.string(),
  finalized_at: z.string().datetime().nullable(),
  finalized_by: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
