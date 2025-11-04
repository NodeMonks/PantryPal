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
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand"),
  barcode: text("barcode").unique(),
  qr_code: text("qr_code").unique(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull(),
  buying_cost: decimal("buying_cost", { precision: 10, scale: 2 }).notNull(),
  manufacturing_date: date("manufacturing_date"),
  expiry_date: date("expiry_date"),
  quantity_in_stock: integer("quantity_in_stock").default(0),
  min_stock_level: integer("min_stock_level").default(5),
  unit: text("unit").default("piece"),
  description: text("description"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const bill_items = pgTable("bill_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bill_id: uuid("bill_id")
    .references(() => bills.id, { onDelete: "cascade" })
    .notNull(),
  product_id: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total_price: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const inventory_transactions = pgTable("inventory_transactions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  product_id: uuid("product_id")
    .references(() => products.id)
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

export const insertProductSchema = createInsertSchema(products);
export const insertCustomerSchema = createInsertSchema(customers);
export const insertBillSchema = createInsertSchema(bills);
export const insertBillItemSchema = createInsertSchema(bill_items);
export const insertInventoryTransactionSchema = createInsertSchema(
  inventory_transactions
);

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

// =============================
// Multi-tenant RBAC + JWT tables
// =============================

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
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

export const user_roles = pgTable("user_roles", {
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
});

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

export type Organization = typeof organizations.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type UserRoleAssignment = typeof user_roles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditLog = typeof audit_logs.$inferSelect;
export type UserInvite = typeof user_invites.$inferSelect;
