import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  decimal,
  timestamp,
  uuid,
  date,
  varchar,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// User roles enum - updated naming
export const userRoleEnum = [
  "admin",
  "store_manager",
  "inventory_manager",
  "cashier",
] as const;
export type UserRole = (typeof userRoleEnum)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoleEnum })
    .notNull()
    .default("inventory_manager"),
  full_name: text("full_name"),
  phone: text("phone"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand"),
  barcode: text("barcode"),
  qr_code: text("qr_code"),
  qr_code_image: text("qr_code_image"),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull(),
  buying_cost: decimal("buying_cost", { precision: 10, scale: 2 }).notNull(),
  manufacturing_date: date("manufacturing_date"),
  expiry_date: date("expiry_date"),
  quantity_in_stock: integer("quantity_in_stock").default(0),
  min_stock_level: integer("min_stock_level").default(5),
  unit: text("unit").default("piece"),
  is_active: boolean("is_active").notNull().default(true),
  description: text("description"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const bills = pgTable("bills", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bill_number: text("bill_number").notNull().unique(),
  customer_id: uuid("customer_id").references(() => customers.id),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount_amount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  tax_amount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  final_amount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  payment_method: text("payment_method").default("cash"),
  finalized_at: timestamp("finalized_at"),
  finalized_by: text("finalized_by"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const bill_items = pgTable("bill_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id")
    .references(() => bills.id, { onDelete: "cascade" })
    .notNull(),
  product_id: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total_price: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const credit_notes = pgTable("credit_notes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bill_id: uuid("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const inventory_transactions = pgTable("inventory_transactions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  product_id: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  transaction_type: text("transaction_type").notNull(), // 'in', 'out', 'adjustment'
  quantity: integer("quantity").notNull(),
  reference_type: text("reference_type"), // 'purchase', 'sale', 'adjustment', 'expired'
  reference_id: text("reference_id"),
  notes: text("notes"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoleEnum).default("inventory_manager"),
});

// Organization Registration (multi-step) schema
export const organizationRegistrationSchema = z.object({
  organization: z.object({
    name: z
      .string()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name must be at most 100 characters"),
  }),
  stores: z
    .array(
      z.object({
        name: z
          .string()
          .min(2, "Store name must be at least 2 characters")
          .max(100, "Store name must be at most 100 characters"),
      })
    )
    .min(1, "At least one store is required")
    .max(10, "Maximum of 10 stores allowed"),
  // GST + Vendor Details (India-specific)
  vendorDetails: z
    .object({
      gst_number: z
        .string()
        .regex(
          /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,
          "Invalid GST number format (15 alphanumeric)"
        )
        .optional()
        .or(z.literal("")),
      owner_name: z
        .string()
        .min(2, "Owner name must be at least 2 characters")
        .optional(),
      owner_phone: z
        .string()
        .regex(/^\+?[0-9\-() ]{7,20}$/, "Invalid phone number")
        .optional(),
      owner_email: z.string().email().optional(),
      msme_number: z.string().optional(),
      business_address: z.string().optional(),
      business_city: z.string().optional(),
      business_state: z.string().optional(),
      business_pin: z
        .string()
        .regex(/^\d{6}$/, "Invalid PIN code (6 digits)")
        .optional(),
    })
    .optional(),
  admin: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be at most 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be at most 100 characters"),
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be at most 100 characters"),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^\+?[0-9\-() ]{7,20}$/.test(val), {
        message: "Invalid phone number format",
      }),
  }),
});

export type OrganizationRegistrationInput = z.infer<
  typeof organizationRegistrationSchema
>;

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  created_at: true,
  updated_at: true,
  org_id: true,
});
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  created_at: true,
  org_id: true,
});
export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  created_at: true,
  org_id: true,
});
export const insertBillItemSchema = createInsertSchema(bill_items).omit({
  id: true,
  created_at: true,
  org_id: true,
});
export const insertCreditNoteSchema = createInsertSchema(credit_notes).omit({
  id: true,
  created_at: true,
  org_id: true,
});
export const insertInventoryTransactionSchema = createInsertSchema(
  inventory_transactions
).omit({
  id: true,
  created_at: true,
  org_id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type BillItem = typeof bill_items.$inferSelect;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type InventoryTransaction = typeof inventory_transactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<
  typeof insertInventoryTransactionSchema
>;
export type CreditNote = typeof credit_notes.$inferSelect;
export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;

// =============================
// Multi-tenant RBAC + JWT tables
// =============================

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  // GST + Vendor Details for India
  gst_number: text("gst_number"),
  owner_name: text("owner_name"),
  owner_phone: text("owner_phone"),
  owner_email: text("owner_email"),
  msme_number: text("msme_number"),
  business_address: text("business_address"),
  business_city: text("business_city"),
  business_state: text("business_state"),
  business_pin: text("business_pin"),
  // Document Verification
  kyc_status: text("kyc_status").default("pending"), // pending | verified | rejected
  verified_at: timestamp("verified_at"),
  verified_by: integer("verified_by").references(() => users.id, {
    onDelete: "set null",
  }),
  verification_notes: text("verification_notes"),
  // Subscription
  payment_status: text("payment_status").default("pending"), // pending | active | inactive
  subscription_id: text("subscription_id"),
  plan_name: text("plan_name").default("starter"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const stores = pgTable("stores", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  description: text("description"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  description: text("description"),
});

export const role_permissions = pgTable("role_permissions", {
  role_id: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permission_id: integer("permission_id")
    .notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),
});

export const user_roles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    store_id: uuid("store_id").references(() => stores.id, {
      onDelete: "cascade",
    }),
    role_id: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Prevent duplicate assignments: one user can only have one role per org
    unique_user_org_role: unique().on(
      table.user_id,
      table.org_id,
      table.role_id
    ),
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  org_id: uuid("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  refresh_token_hash: text("refresh_token_hash").notNull(),
  user_agent: text("user_agent"),
  ip_address: text("ip_address"),
  expires_at: timestamp("expires_at").notNull(),
  revoked_at: timestamp("revoked_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const audit_logs = pgTable("audit_logs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_id: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  org_id: uuid("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 128 }).notNull(),
  details: text("details"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const user_invites = pgTable("user_invites", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  org_id: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  full_name: text("full_name"),
  phone: text("phone"),
  role_id: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  store_id: uuid("store_id").references(() => stores.id, {
    onDelete: "set null",
  }),
  token_hash: text("token_hash").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  accepted_at: timestamp("accepted_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ===============
// Validation Schemas
// ===============

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().optional(),
});

export const loginEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const inviteCreateSchema = z.object({
  org_id: z.string().uuid(),
  email: z.string().email(),
  role_id: z.number().int().positive(),
  store_id: z.string().uuid().optional(),
  expires_in_hours: z.number().int().min(1).max(168).default(48),
  full_name: z.string().min(2),
  phone: z.string().min(6),
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(16),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const onboardingTokenCreateSchema = z.object({
  email: z.string().email(),
  company_name: z.string().min(2).max(100),
  expires_in_hours: z.number().int().min(1).max(168).default(72), // 3 days default
});

export type Organization = typeof organizations.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type UserRoleAssignment = typeof user_roles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditLog = typeof audit_logs.$inferSelect;
export type UserInvite = typeof user_invites.$inferSelect;
