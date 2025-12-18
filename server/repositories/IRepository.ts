// Base repository interface with common CRUD operations
import type { SQL } from "drizzle-orm";

export interface IRepository<T> {
  findById(id: string | number, orgId?: string): Promise<T | null>;
  findAll(orgId: string, filters?: Record<string, any>): Promise<T[]>;
  create(
    data: Omit<T, "id" | "created_at" | "updated_at">,
    orgId: string
  ): Promise<T>;
  update(
    id: string | number,
    data: Partial<T>,
    orgId: string
  ): Promise<T | null>;
  softDelete(id: string | number, orgId: string): Promise<boolean>;
  delete(id: string | number, orgId: string): Promise<boolean>;
}
