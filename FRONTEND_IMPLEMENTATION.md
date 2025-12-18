# Frontend Implementation - Feature Stores & Offline Support

## Overview

This document describes the frontend implementation of feature stores with per-org caching and offline support using Zustand and IndexedDB.

## Architecture

### 1. Feature Stores (Zustand)

Located in `client/src/stores/`, these manage application state with persistence:

- **productStore.ts**: Product inventory management

  - Load products with IndexedDB caching
  - Search and filter products
  - Sync with server
  - Full-text search across name, category, brand

- **customerStore.ts**: Customer relationship management

  - Load customers with caching
  - Search by name, email, phone
  - Email/phone uniqueness within org
  - Sync with server

- **billStore.ts**: Billing and invoice management

  - Create bills (with offline support)
  - Track pending sync items (created offline)
  - Finalization immutability
  - Sync with server

- **inventoryStore.ts**: Inventory tracking
  - Low stock alerts
  - Expiry alerts
  - Stock in/out transactions
  - Inventory adjustments

### 2. Sync Manager Hook

**Location**: `client/src/hooks/useSyncManager.ts`

Manages:

- Online/offline detection
- Automatic sync when coming online
- Periodic sync every 30 seconds
- Manual sync trigger
- Pending changes tracking

**Features**:

```typescript
const {
  isOnline, // boolean - connection status
  isSyncing, // boolean - sync in progress
  lastSyncTime, // number | null - last successful sync
  pendingChanges, // number - changes waiting to sync
  manualSync, // () => Promise<void> - trigger sync
} = useSyncManager(orgId);
```

### 3. Sync Status Component

**Location**: `client/src/components/SyncStatus.tsx`

Displays:

- Connection status (online/offline badge)
- Pending changes count
- Last sync time
- Manual sync button
- Auto-hides when no issues

### 4. IndexedDB Cache

**Location**: `client/src/lib/indexeddb.ts` (existing)

Caching strategy:

- Products: indexed by org_id + barcode
- Customers: indexed by org_id + phone
- Bills: indexed by org_id + created_at
- Scans: audit trail of QR/barcode scans

### 5. API Client Enhancement

**Location**: `client/src/lib/api.ts`

New methods:

```typescript
getProducts(orgId?: string): Promise<Product[]>
getCustomers(orgId?: string): Promise<Customer[]>
getBills(orgId?: string): Promise<Bill[]>
getLowStockProducts(orgId?: string): Promise<Product[]>
getExpiringProducts(orgId?: string): Promise<Product[]>
recordStockIn(orgId, data): Promise<void>
recordStockOut(orgId, data): Promise<void>
adjustStock(orgId, data): Promise<void>
```

## Usage Examples

### Loading Products with Store

```typescript
import { useProductStore } from "@/stores/productStore";
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user } = useAuth();
  const { products, loading, error, searchProducts } = useProductStore();

  useEffect(() => {
    if (user?.org_id) {
      productStore.loadProducts(user.org_id);
    }
  }, [user?.org_id]);

  const results = searchProducts("electronics");

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {results.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### Offline Handling

```typescript
import { useSyncManager } from "@/hooks/useSyncManager";

function OfflineAwareComponent() {
  const { isOnline, pendingChanges, manualSync } = useSyncManager(orgId);

  if (!isOnline) {
    return <OfflineWarning onManualSync={manualSync} />;
  }

  if (pendingChanges > 0) {
    return <PendingSyncNotice count={pendingChanges} />;
  }

  return <NormalComponent />;
}
```

### Creating Bills Offline

```typescript
const { createBill } = useBillStore();

try {
  const bill = await createBill({
    bill_number: "INV-001",
    customer_id: "cust-123",
    total_amount: "100",
    final_amount: "100",
    payment_method: "cash",
  });
  // Bill created locally, will sync when online
} catch (error) {
  // Bill stored for later sync
  console.log("Stored for sync:", error);
}
```

### Recording Inventory

```typescript
const { recordStockIn, recordStockOut } = useInventoryStore();

// Stock in (receiving shipment)
await recordStockIn(productId, 50, orgId);

// Stock out (selling)
await recordStockOut(productId, 5, orgId);

// Adjust for discrepancies
await adjustStock(productId, -10, "Physical count adjustment", orgId);
```

## Data Flow

### Online Scenario

```
User Action → Store Action → API Call → Server → Database
                     ↓
                   Cache (IndexedDB)
                     ↓
                  Update UI
```

### Offline Scenario

```
User Action → Store Action → Store (pending) → Cache (IndexedDB)
                     ↓
                  Show Offline Badge
                     ↓
                  (Continue working)
                     ↓
Connection Restored → Sync All → API Calls → Server → Merge State
                     ↓
                  Update UI
```

## Sync Strategy

### Automatic Sync

1. **On Connection Restored**: Immediate sync of all stores
2. **Periodic Background**: Every 30 seconds when online
3. **On Focus**: When window regains focus (future enhancement)

### Manual Sync

User can trigger manual sync via SyncStatus component button

### Conflict Resolution

For offline-created items:

- Bills: Use local IDs (prefixed with "offline-") until server assigns real IDs
- Products: Retry sync when online (server validates uniqueness)
- Customers: Retry sync when online

## Per-Org Isolation

All stores enforce org_id scoping:

```typescript
// Only returns products for current org
const products = await productStore.loadProducts(orgId);

// Cache keyed by org_id + resource
await cache.putProducts({
  id: product.id,
  orgId: orgId,  // ← Org scoping
  storeId: orgId,
  ...
});
```

## IndexedDB Schema

```
Stores:
├── products: [orgId, storeId, barcode, updatedAt]
├── customers: [orgId, storeId, phone, updatedAt]
├── bills: [orgId, storeId, createdAt]
└── scans: [orgId, storeId, code, ts]
```

## Performance Considerations

1. **Lazy Loading**: Stores only load data when explicitly requested
2. **Caching**: IndexedDB cache reduces API calls
3. **Periodic Sync**: 30-second interval balances freshness vs. network load
4. **Store Persistence**: Zustand persist middleware saves to localStorage
5. **Concurrent Sync**: All stores sync in parallel with Promise.all

## Error Handling

All stores include:

- Error state tracking
- Error clearing on successful operations
- User-facing error messages via UI
- Retry capability for failed syncs

## Testing

Test coverage includes:

- Store creation and state management
- Offline sync behavior
- Cache hit/miss scenarios
- Multi-org isolation
- Sync status transitions

## Future Enhancements

1. **Optimistic Updates**: Update UI before server confirmation
2. **Conflict Resolution**: Handle concurrent edits
3. **Background Sync API**: Service Worker integration
4. **Selective Sync**: Sync only changed items
5. **Compression**: Store more data with less space
6. **Encryption**: Secure offline data

## Migration Path

For existing pages to use stores:

1. Import store hook
2. Replace API calls with store methods
3. Use store loading/error states
4. Test offline scenarios
5. Deploy with feature flag (optional)

Example migration:

```diff
- const [products, setProducts] = useState([]);
- useEffect(() => {
-   api.getProducts().then(setProducts);
- }, []);

+ const { products, loading, error } = useProductStore();
+ useEffect(() => {
+   if (user?.org_id) {
+     productStore.loadProducts(user.org_id);
+   }
+ }, [user?.org_id, productStore]);
```

## Debugging

Enable debug logging:

```typescript
// In useSyncManager
console.log("Sync status:", { isOnline, isSyncing, pendingChanges });

// In stores
console.log("Cache state:", { products, lastSync, error });

// In IndexedDB
await cache.getProducts({ orgId: "test-org", storeId: "store-1" });
```

---

**Implementation Status**: ✅ Complete

- All feature stores created and functional
- Sync manager hook with online/offline detection
- SyncStatus component integrated
- IndexedDB caching operational
- API client enhanced with org scoping
