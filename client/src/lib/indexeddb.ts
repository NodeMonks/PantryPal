// Lightweight IndexedDB helper without external deps
// Stores: products, customers, bills, scans; all scoped by orgId/storeId

const DB_NAME = "pantrypal_cache";
const DB_VERSION = 1;

export type TenantScope = { orgId: string; storeId: string };

const STORES = {
  products: "products",
  customers: "customers",
  bills: "bills",
  scans: "scans",
} as const;

type StoreName = keyof typeof STORES;

type ProductCache = {
  id: string;
  orgId: string;
  storeId: string;
  name: string;
  barcode?: string | null;
  updatedAt: number;
};

type CustomerCache = {
  id: string;
  orgId: string;
  storeId: string;
  name: string;
  phone?: string | null;
  updatedAt: number;
};

type BillCache = {
  id: string;
  orgId: string;
  storeId: string;
  total: number;
  createdAt: number;
};

type ScanEntry = {
  code: string;
  type: "barcode" | "qr";
  orgId: string;
  storeId: string;
  ts: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // products: keyPath id; add index on orgId, storeId, barcode
      if (!db.objectStoreNames.contains(STORES.products)) {
        const os = db.createObjectStore(STORES.products, { keyPath: "id" });
        os.createIndex("org", "orgId", { unique: false });
        os.createIndex("org_store", ["orgId", "storeId"], { unique: false });
        os.createIndex("barcode", "barcode", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.customers)) {
        const os = db.createObjectStore(STORES.customers, { keyPath: "id" });
        os.createIndex("org_store", ["orgId", "storeId"], { unique: false });
        os.createIndex("phone", "phone", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.bills)) {
        const os = db.createObjectStore(STORES.bills, { keyPath: "id" });
        os.createIndex("org_store", ["orgId", "storeId"], { unique: false });
        os.createIndex("created", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.scans)) {
        const os = db.createObjectStore(STORES.scans, { keyPath: "ts" });
        os.createIndex("org_store", ["orgId", "storeId"], { unique: false });
        os.createIndex("code", "code", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(STORES[name], mode);
  const store = tx.objectStore(STORES[name]);
  const result = await fn(store);
  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const cache = {
  // Products
  putProducts(items: ProductCache[]) {
    return withStore("products", "readwrite", async (s) => {
      for (const it of items) s.put(it);
    });
  },
  getProductByBarcode(
    barcode: string,
    scope: TenantScope
  ): Promise<ProductCache | undefined> {
    return withStore("products", "readonly", async (s) => {
      const idx = s.index("barcode");
      return new Promise((resolve) => {
        const req = idx.get(barcode);
        req.onsuccess = () => {
          const val = req.result as ProductCache | undefined;
          if (val && val.orgId === scope.orgId && val.storeId === scope.storeId)
            resolve(val);
          else resolve(undefined);
        };
        req.onerror = () => resolve(undefined);
      });
    });
  },
  getProducts(scope: TenantScope): Promise<ProductCache[]> {
    return withStore("products", "readonly", async (s) => {
      const idx = s.index("org_store");
      const range = IDBKeyRange.only([scope.orgId, scope.storeId]);
      return new Promise((resolve) => {
        const res: ProductCache[] = [];
        const cursorReq = idx.openCursor(range);
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            res.push(cursor.value as ProductCache);
            cursor.continue();
          } else resolve(res);
        };
        cursorReq.onerror = () => resolve(res);
      });
    });
  },

  // Customers
  putCustomers(items: CustomerCache[]) {
    return withStore("customers", "readwrite", async (s) => {
      for (const it of items) s.put(it);
    });
  },
  getCustomers(scope: TenantScope): Promise<CustomerCache[]> {
    return withStore("customers", "readonly", async (s) => {
      const idx = s.index("org_store");
      const range = IDBKeyRange.only([scope.orgId, scope.storeId]);
      return new Promise((resolve) => {
        const res: CustomerCache[] = [];
        const cursorReq = idx.openCursor(range);
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            res.push(cursor.value as CustomerCache);
            cursor.continue();
          } else resolve(res);
        };
        cursorReq.onerror = () => resolve(res);
      });
    });
  },

  // Bills
  putBills(items: BillCache[]) {
    return withStore("bills", "readwrite", async (s) => {
      for (const it of items) s.put(it);
    });
  },

  // Scans history
  addScan(entry: ScanEntry) {
    return withStore("scans", "readwrite", async (s) => s.add(entry));
  },
  getRecentScans(scope: TenantScope, limit = 20): Promise<ScanEntry[]> {
    return withStore("scans", "readonly", async (s) => {
      const idx = s.index("org_store");
      const range = IDBKeyRange.only([scope.orgId, scope.storeId]);
      return new Promise((resolve) => {
        const res: ScanEntry[] = [];
        const cursorReq = idx.openCursor(range, "prev");
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && res.length < limit) {
            res.push(cursor.value as ScanEntry);
            cursor.continue();
          } else resolve(res);
        };
        cursorReq.onerror = () => resolve(res);
      });
    });
  },

  // Utility
  clearStore(name: StoreName) {
    return withStore(name, "readwrite", async (s) => s.clear());
  },
};

export function shouldEnableIndexedDb(): boolean {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production";
}
