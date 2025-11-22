# Multi-Tenant Architecture Implementation

## Overview

Implemented complete multi-tenant isolation where each organization has multiple stores, and each store maintains its own isolated product inventory, customers, bills, and transactions.

## Architecture Changes

### Database Schema Updates

#### 1. Products Table

- **Added:** `org_id` (uuid, NOT NULL, FK to organizations)
- **Added:** `store_id` (uuid, NOT NULL, FK to stores)
- **Removed:** UNIQUE constraints on `barcode` and `qr_code` (now unique per store, not globally)
- **Impact:** Products are now scoped to specific stores

#### 2. Customers Table

- **Added:** `org_id` (uuid, NOT NULL, FK to organizations)
- **Added:** `store_id` (uuid, NOT NULL, FK to stores)
- **Impact:** Customer records are store-specific

#### 3. Bills Table

- **Added:** `org_id` (uuid, NOT NULL, FK to organizations)
- **Added:** `store_id` (uuid, NOT NULL, FK to stores)
- **Impact:** All billing is scoped to specific stores

#### 4. Inventory Transactions Table

- **Added:** `org_id` (uuid, NOT NULL, FK to organizations)
- **Added:** `store_id` (uuid, NOT NULL, FK to stores)
- **Impact:** Inventory movements are tracked per store

### TypeScript Schema Changes (`shared/schema.ts`)

#### Updated Insert Schemas

All insert schemas now omit `org_id` and `store_id` fields:

- `insertProductSchema`
- `insertCustomerSchema`
- `insertBillSchema`
- `insertInventoryTransactionSchema`

These fields are automatically injected by the backend based on the authenticated user's context.

## Backend Changes

### 1. Tenant Context Middleware (`server/middleware/tenantContext.ts`)

**New Functions:**

- `requireOrgId(req)` - Extracts org_id from JWT context, throws if missing
- `requireStoreId(req)` - Gets user's primary store (first store assignment)
- `getStoreId(req)` - Gets store from route param or falls back to user's primary store
- `tenantScope()` - Middleware that attaches orgId and storeId to request

**Usage:**

```typescript
const orgId = requireOrgId(req);
const storeId = requireStoreId(req);
```

### 2. Storage Layer (`server/storage.ts`)

**New Type:**

```typescript
export type TenantContext = {
  orgId: string;
  storeId: string;
};
```

**Updated Interface:**
All storage methods now require `TenantContext`:

```typescript
getProducts(ctx: TenantContext): Promise<Product[]>
createProduct(product: InsertProduct, ctx: TenantContext): Promise<Product>
// ... etc for all entities
```

**Implementation:**

- All SELECT queries filter by `org_id` AND `store_id`
- All INSERT queries inject `org_id` and `store_id`
- Ensures complete data isolation between stores

### 3. API Routes (`server/routes.ts`)

**Updated All Routes:**

```typescript
// Before
const products = await storage.getProducts();

// After
const orgId = requireOrgId(req);
const storeId = requireStoreId(req);
const products = await storage.getProducts({ orgId, storeId });
```

**Affected Endpoints:**

- `/api/products` (GET, POST, PUT, DELETE)
- `/api/customers` (GET, POST)
- `/api/bills` (GET, POST)
- `/api/bills/:billId/items` (GET, POST)
- `/api/inventory-transactions` (GET, POST)

### 4. Organization Registration (`server/authRoutes.ts`)

**Existing Flow (Already Correct):**

1. Creates organization
2. Creates multiple stores
3. Creates admin user
4. Assigns admin to first store via `user_roles` table

The admin is automatically assigned to the first store created during org registration.

## Multi-Tenant Isolation

### How It Works

#### 1. User Authentication (JWT)

JWT payload includes:

```typescript
{
  sub: userId,
  orgId: "uuid",
  roles: ["admin", "store_manager"],
  stores: ["store-uuid-1", "store-uuid-2"]  // All stores user has access to
}
```

#### 2. Request Flow

```
Client Request
  ↓
JWT Auth Middleware (extracts orgId, stores from token)
  ↓
requireOrgId() / requireStoreId() (validates and extracts context)
  ↓
Storage Layer (filters by orgId + storeId)
  ↓
Database (CASCADE DELETE ensures clean removal)
```

#### 3. Data Scoping Rules

**Organization Level (org_id):**

- One organization = complete tenant isolation
- Different organizations NEVER see each other's data

**Store Level (store_id):**

- Within an org, each store has its own:
  - Products inventory
  - Customer records
  - Bills/invoices
  - Inventory transactions

**User Access:**

- Users are assigned to specific stores via `user_roles` table
- A user can have access to multiple stores within their org
- The system uses the user's "primary" store (first in `ctx.stores` array)
- Future: Can add store switching UI to let users pick which store to view

### Security Guarantees

1. **No Cross-Org Data Leakage:**

   - All queries filter by `org_id` from authenticated user's JWT
   - Database foreign keys with CASCADE DELETE

2. **Store Isolation:**

   - Each store's data is completely separate
   - Product with same barcode can exist in multiple stores

3. **Role-Based Access:**
   - Existing RBAC system still applies
   - Store context adds additional layer of isolation

## Migration Instructions

### For New Deployments

1. Run `server/sql/schema.sql` - Creates all tables with multi-tenant columns
2. Run `server/sql/seed_roles_permissions.sql` - Seeds RBAC
3. Use `/api/auth/register-organization` endpoint to create first org

### For Existing Deployments

1. **Backup your database!**
2. Run `server/sql/migration_multi_tenant.sql`:

   - Adds `org_id` and `store_id` columns (nullable initially)
   - Creates foreign key constraints
   - Removes unique constraints on product barcodes/QR codes

3. **Populate tenant columns:**

   ```sql
   -- If you have one org/store, populate all records
   UPDATE products SET org_id = '<your-org-id>', store_id = '<your-store-id>';
   UPDATE customers SET org_id = '<your-org-id>', store_id = '<your-store-id>';
   UPDATE bills SET org_id = '<your-org-id>', store_id = '<your-store-id>';
   UPDATE inventory_transactions SET org_id = '<your-org-id>', store_id = '<your-store-id>';
   ```

4. **Make columns NOT NULL:**

   ```sql
   ALTER TABLE products ALTER COLUMN org_id SET NOT NULL;
   ALTER TABLE products ALTER COLUMN store_id SET NOT NULL;
   -- Repeat for customers, bills, inventory_transactions
   ```

5. Deploy updated code
6. Test thoroughly!

## Testing Multi-Tenant Isolation

### Test Scenarios

1. **Create Two Organizations:**

   - Register Org A with Store A1
   - Register Org B with Store B1
   - Verify each admin can only see their own data

2. **Multi-Store Organization:**

   - Create Org C with Store C1 and Store C2
   - Add products to C1
   - Verify C2 doesn't see C1's products
   - Invite user to C2, verify they can't access C1 data

3. **User Store Assignment:**

   - Create user assigned to Store C1
   - Verify API calls automatically scope to C1
   - Change user's primary store in `user_roles`
   - Verify data access shifts to new store

4. **Cross-Tenant Attack Prevention:**
   - User from Org A tries to access Org B's product by ID
   - Should return 404 or empty (not 403 to avoid info leakage)

## Frontend Considerations

### Current State

- Frontend doesn't need changes for basic functionality
- Backend automatically applies tenant scoping
- Users see only their org/store data transparently

### Future Enhancements

1. **Store Selector (for multi-store users):**

   ```typescript
   // Add to dashboard header
   const userStores = useAuth().stores;
   const [activeStore, setActiveStore] = useState(userStores[0]);
   ```

2. **Store Context Provider:**

   ```typescript
   // client/src/contexts/StoreContext.tsx
   export const StoreContext = createContext({
     currentStore: null,
     setCurrentStore: () => {},
     availableStores: [],
   });
   ```

3. **API Client with Store Header:**
   ```typescript
   // Optional: Allow frontend to specify which store to query
   fetch("/api/products", {
     headers: {
       "X-Store-ID": selectedStoreId,
     },
   });
   ```

## Performance Considerations

1. **Indexes Needed:**

   ```sql
   CREATE INDEX idx_products_org_store ON products(org_id, store_id);
   CREATE INDEX idx_customers_org_store ON customers(org_id, store_id);
   CREATE INDEX idx_bills_org_store ON bills(org_id, store_id);
   CREATE INDEX idx_inventory_org_store ON inventory_transactions(org_id, store_id);
   ```

2. **Query Optimization:**
   - All queries now filter by two UUIDs (org_id, store_id)
   - Composite indexes will speed up lookups
   - Consider partitioning by org_id for very large deployments

## Rollback Plan

If issues arise:

1. **Keep old code branch**
2. **Database rollback:**
   ```sql
   ALTER TABLE products DROP COLUMN org_id, DROP COLUMN store_id;
   ALTER TABLE customers DROP COLUMN org_id, DROP COLUMN store_id;
   ALTER TABLE bills DROP COLUMN org_id, DROP COLUMN store_id;
   ALTER TABLE inventory_transactions DROP COLUMN org_id, DROP COLUMN store_id;
   ```
3. **Restore unique constraints:**
   ```sql
   ALTER TABLE products ADD CONSTRAINT products_barcode_key UNIQUE(barcode);
   ALTER TABLE products ADD CONSTRAINT products_qr_code_key UNIQUE(qr_code);
   ```
4. Deploy previous version

## Benefits Achieved

✅ **Complete multi-tenant isolation** - Orgs can't access each other's data
✅ **Store-specific inventory** - Each store maintains separate product catalog
✅ **Scalable architecture** - Support unlimited orgs and stores per org
✅ **Security by default** - Backend enforces isolation, no frontend responsibility
✅ **Role-based access preserved** - RBAC works alongside tenant scoping
✅ **Data integrity** - Foreign keys with CASCADE DELETE prevent orphaned records
✅ **Flexible user assignment** - Users can belong to multiple stores

## Next Steps (Optional Enhancements)

1. **Store Switching UI** - Let users with multiple store access switch between them
2. **Cross-Store Reports** - Org admins view aggregated data across all stores
3. **Store Transfer** - Move products/customers between stores within org
4. **Multi-Store Billing** - Create bills that pull inventory from multiple stores
5. **Store Groups** - Hierarchical store organization (regions, chains, etc.)
6. **Audit Logging** - Track which store each action was performed in
