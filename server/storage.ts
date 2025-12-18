import { db } from "./db";
import {
  users,
  products,
  customers,
  bills,
  bill_items,
  credit_notes,
  inventory_transactions,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Customer,
  type InsertCustomer,
  type Bill,
  type InsertBill,
  type BillItem,
  type InsertBillItem,
  type CreditNote,
  type InsertCreditNote,
  type InventoryTransaction,
  type InsertInventoryTransaction,
} from "@shared/schema";
import { eq, desc, gte, lt, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export type TenantContext = {
  orgId: string;
};

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Product methods
  getProducts(ctx: TenantContext): Promise<Product[]>;
  getProduct(id: string, ctx: TenantContext): Promise<Product | undefined>;
  createProduct(product: InsertProduct, ctx: TenantContext): Promise<Product>;
  updateProduct(
    id: string,
    product: Partial<InsertProduct>,
    ctx: TenantContext
  ): Promise<Product | undefined>;
  deleteProduct(id: string, ctx: TenantContext): Promise<Product | undefined>;

  // Customer methods
  getCustomers(ctx: TenantContext): Promise<Customer[]>;
  getCustomer(id: string, ctx: TenantContext): Promise<Customer | undefined>;
  createCustomer(
    customer: InsertCustomer,
    ctx: TenantContext
  ): Promise<Customer>;

  // Bill methods
  getBills(ctx: TenantContext): Promise<Bill[]>;
  getBillsForToday(ctx: TenantContext): Promise<Bill[]>;
  getBill(id: string, ctx: TenantContext): Promise<Bill | undefined>;
  updateBill(
    id: string,
    bill: Partial<InsertBill>,
    ctx: TenantContext
  ): Promise<Bill | undefined>;
  createBill(bill: InsertBill, ctx: TenantContext): Promise<Bill>;

  // Bill item methods
  getBillItems(
    billId: string,
    ctx: TenantContext
  ): Promise<Array<BillItem & { product_name?: string }>>;
  createBillItem(
    billItem: InsertBillItem,
    ctx: TenantContext
  ): Promise<BillItem>;

  getCreditNotes(billId: string, ctx: TenantContext): Promise<CreditNote[]>;
  createCreditNote(
    creditNote: InsertCreditNote,
    ctx: TenantContext
  ): Promise<CreditNote>;

  // Inventory transaction methods
  getInventoryTransactions(
    ctx: TenantContext,
    productId?: string
  ): Promise<InventoryTransaction[]>;
  createInventoryTransaction(
    transaction: InsertInventoryTransaction,
    ctx: TenantContext
  ): Promise<InventoryTransaction>;
}

export class DrizzleStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Product methods
  async getProducts(ctx: TenantContext): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.org_id, ctx.orgId),
          eq((products as any).is_active, true)
        )
      )
      .orderBy(products.name);
  }

  async getProduct(
    id: string,
    ctx: TenantContext
  ): Promise<Product | undefined> {
    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.org_id, ctx.orgId)))
      .limit(1);
    return result[0];
  }

  async createProduct(
    product: InsertProduct,
    ctx: TenantContext
  ): Promise<Product> {
    const result = await db
      .insert(products)
      .values({
        ...(product as any),
        org_id: ctx.orgId,
      } as any)
      .returning();
    return result[0];
  }

  async updateProduct(
    id: string,
    product: Partial<InsertProduct>,
    ctx: TenantContext
  ): Promise<Product | undefined> {
    const result = await db
      .update(products)
      .set(product as any)
      .where(and(eq(products.id, id), eq(products.org_id, ctx.orgId)))
      .returning();
    return result[0];
  }

  async deleteProduct(
    id: string,
    ctx: TenantContext
  ): Promise<Product | undefined> {
    const result = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.org_id, ctx.orgId)))
      .returning();
    return result[0];
  }

  // Customer methods
  async getCustomers(ctx: TenantContext): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.org_id, ctx.orgId))
      .orderBy(customers.name);
  }

  async getCustomer(
    id: string,
    ctx: TenantContext
  ): Promise<Customer | undefined> {
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.org_id, ctx.orgId)))
      .limit(1);
    return result[0];
  }

  async createCustomer(
    customer: InsertCustomer,
    ctx: TenantContext
  ): Promise<Customer> {
    const result = await db
      .insert(customers)
      .values({
        ...(customer as any),
        org_id: ctx.orgId,
      } as any)
      .returning();
    return result[0];
  }

  // Bill methods
  async getBills(ctx: TenantContext): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(eq(bills.org_id, ctx.orgId))
      .orderBy(desc(bills.created_at));
  }

  async getBillsForToday(ctx: TenantContext): Promise<Bill[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    return await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.org_id, ctx.orgId),
          gte(bills.created_at, startOfDay),
          lt(bills.created_at, endOfDay)
        )
      )
      .orderBy(desc(bills.created_at));
  }

  async getBill(id: string, ctx: TenantContext): Promise<Bill | undefined> {
    const result = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, id), eq(bills.org_id, ctx.orgId)))
      .limit(1);
    return result[0];
  }

  async updateBill(
    id: string,
    bill: Partial<InsertBill>,
    ctx: TenantContext
  ): Promise<Bill | undefined> {
    const result = await db
      .update(bills)
      .set(bill as any)
      .where(and(eq(bills.id, id), eq(bills.org_id, ctx.orgId)))
      .returning();
    return result[0];
  }

  async createBill(bill: InsertBill, ctx: TenantContext): Promise<Bill> {
    const result = await db
      .insert(bills)
      .values({
        ...(bill as any),
        org_id: ctx.orgId,
      } as any)
      .returning();
    return result[0];
  }

  // Bill item methods
  async getBillItems(
    billId: string,
    ctx: TenantContext
  ): Promise<Array<BillItem & { product_name?: string }>> {
    // Join with bills to ensure tenant isolation
    return await db
      .select({
        id: bill_items.id,
        org_id: (bill_items as any).org_id,
        bill_id: bill_items.bill_id,
        product_id: bill_items.product_id,
        product_name: (products as any).name,
        quantity: bill_items.quantity,
        unit_price: bill_items.unit_price,
        total_price: bill_items.total_price,
        created_at: bill_items.created_at,
      })
      .from(bill_items)
      .leftJoin(bills, eq(bill_items.bill_id, bills.id))
      .leftJoin(products, eq(bill_items.product_id, products.id))
      .where(and(eq(bill_items.bill_id, billId), eq(bills.org_id, ctx.orgId)));
  }

  async createBillItem(
    billItem: InsertBillItem,
    ctx: TenantContext
  ): Promise<BillItem> {
    // Include org_id for tenant isolation on bill_items
    const result = await db
      .insert(bill_items)
      .values({ ...(billItem as any), org_id: ctx.orgId } as any)
      .returning();
    return result[0];
  }

  async getCreditNotes(
    billId: string,
    ctx: TenantContext
  ): Promise<CreditNote[]> {
    return await db
      .select()
      .from(credit_notes)
      .where(
        and(
          eq(credit_notes.bill_id, billId),
          eq(credit_notes.org_id, ctx.orgId)
        )
      )
      .orderBy(desc(credit_notes.created_at));
  }

  async createCreditNote(
    creditNote: InsertCreditNote,
    ctx: TenantContext
  ): Promise<CreditNote> {
    const result = await db
      .insert(credit_notes)
      .values({ ...(creditNote as any), org_id: ctx.orgId } as any)
      .returning();
    return result[0];
  }

  // Inventory transaction methods
  async getInventoryTransactions(
    ctx: TenantContext,
    productId?: string
  ): Promise<InventoryTransaction[]> {
    if (productId) {
      return await db
        .select()
        .from(inventory_transactions)
        .where(
          and(
            eq(inventory_transactions.product_id, productId),
            eq(inventory_transactions.org_id, ctx.orgId)
          )
        )
        .orderBy(desc(inventory_transactions.created_at));
    }
    return await db
      .select()
      .from(inventory_transactions)
      .where(eq(inventory_transactions.org_id, ctx.orgId))
      .orderBy(desc(inventory_transactions.created_at));
  }

  async createInventoryTransaction(
    transaction: InsertInventoryTransaction,
    ctx: TenantContext
  ): Promise<InventoryTransaction> {
    const result = await db
      .insert(inventory_transactions)
      .values({
        ...(transaction as any),
        org_id: ctx.orgId,
      } as any)
      .returning();
    return result[0];
  }
}

export const storage = new DrizzleStorage();
