import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cache, type ProductCache, type TenantScope } from "@/lib/indexeddb";
import { api, type Product } from "@/lib/api";

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lastSync: number | null;
  currentOrgId: string | null;

  // Actions
  loadProducts: (orgId: string) => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  searchProducts: (query: string) => Product[];
  syncWithServer: (orgId: string) => Promise<void>;
  clearCache: () => void;
  setError: (error: string | null) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      loading: false,
      error: null,
      lastSync: null,
      currentOrgId: null,

      loadProducts: async (orgId: string) => {
        set({ loading: true, currentOrgId: orgId });
        try {
          // Try to load from IndexedDB first
          const cached = await cache.getProducts({ orgId, storeId: orgId });
          if (cached.length > 0) {
            const products: Product[] = cached.map((c: ProductCache) => ({
              id: c.id,
              name: c.name,
              category: "",
              brand: null,
              mrp: "0",
              buying_cost: "0",
              quantity_in_stock: 0,
              min_stock_level: 0,
              unit: "piece",
              expiry_date: null,
              qr_code: c.qr_code || null,
              created_at: new Date(c.updatedAt).toISOString(),
              description: null,
              manufacturing_date: null,
              updated_at: new Date(c.updatedAt).toISOString(),
              barcode: c.barcode || null,
            }));
            set({ products, loading: false, error: null });
          }

          // Fetch from server
          const response = await api.getProducts(orgId);
          set({ products: response, loading: false, error: null, lastSync: Date.now() });

          // Cache in IndexedDB
          const cached_items = response.map((p: Product) => ({
            id: p.id,
            orgId,
            storeId: orgId,
            name: p.name,
            barcode: p.barcode,
            updatedAt: Date.now(),
          }));
          await cache.putProducts(cached_items);
        } catch (error) {
          const message = (error as Error).message || "Failed to load products";
          set({ error: message, loading: false });
        }
      },

      addProduct: (product: Product) => {
        const state = get();
        const updated = [...state.products, product];
        set({ products: updated });
      },

      updateProduct: (productId: string, updates: Partial<Product>) => {
        const state = get();
        const updated = state.products.map((p) =>
          p.id === productId ? { ...p, ...updates } : p
        );
        set({ products: updated });
      },

      deleteProduct: (productId: string) => {
        const state = get();
        const updated = state.products.filter((p) => p.id !== productId);
        set({ products: updated });
      },

      searchProducts: (query: string) => {
        const state = get();
        const lower = query.toLowerCase();
        return state.products.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            p.category.toLowerCase().includes(lower) ||
            (p.brand && p.brand.toLowerCase().includes(lower))
        );
      },

      syncWithServer: async (orgId: string) => {
        set({ loading: true });
        try {
          const response = await api.getProducts(orgId);
          set({ products: response, loading: false, lastSync: Date.now(), error: null });

          // Update cache
          const cached_items = response.map((p: Product) => ({
            id: p.id,
            orgId,
            storeId: orgId,
            name: p.name,
            barcode: p.barcode,
            updatedAt: Date.now(),
          }));
          await cache.putProducts(cached_items);
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      clearCache: () => {
        set({ products: [], lastSync: null, currentOrgId: null, error: null });
        cache.clearStore("products");
      },

      setError: (error) => set({ error }),
    }),
    {
      name: "product-store",
      version: 1,
    }
  )
);
