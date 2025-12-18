import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type Product } from "@/lib/api";

interface InventoryState {
  lowStockProducts: Product[];
  expiringProducts: Product[];
  loading: boolean;
  error: string | null;
  lastSync: number | null;
  currentOrgId: string | null;

  // Actions
  loadInventoryAlerts: (orgId: string) => Promise<void>;
  recordStockIn: (
    productId: string,
    quantity: number,
    orgId: string
  ) => Promise<void>;
  recordStockOut: (
    productId: string,
    quantity: number,
    orgId: string
  ) => Promise<void>;
  adjustStock: (
    productId: string,
    delta: number,
    reason: string,
    orgId: string
  ) => Promise<void>;
  syncWithServer: (orgId: string) => Promise<void>;
  clearCache: () => void;
  setError: (error: string | null) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      lowStockProducts: [],
      expiringProducts: [],
      loading: false,
      error: null,
      lastSync: null,
      currentOrgId: null,

      loadInventoryAlerts: async (orgId: string) => {
        set({ loading: true, currentOrgId: orgId });
        try {
          // Fetch low stock and expiring products from server
          const [lowStock, expiring] = await Promise.all([
            api.getLowStockProducts(orgId),
            api.getExpiringProducts(orgId),
          ]);

          set({
            lowStockProducts: lowStock,
            expiringProducts: expiring,
            loading: false,
            error: null,
            lastSync: Date.now(),
          });
        } catch (error) {
          const message =
            (error as Error).message || "Failed to load inventory alerts";
          set({ error: message, loading: false });
        }
      },

      recordStockIn: async (
        productId: string,
        quantity: number,
        orgId: string
      ) => {
        try {
          await api.recordStockIn(orgId, { product_id: productId, quantity });
          // Refresh alerts after stock in
          await get().loadInventoryAlerts(orgId);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      recordStockOut: async (
        productId: string,
        quantity: number,
        orgId: string
      ) => {
        try {
          await api.recordStockOut(orgId, { product_id: productId, quantity });
          // Refresh alerts after stock out
          await get().loadInventoryAlerts(orgId);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      adjustStock: async (
        productId: string,
        delta: number,
        reason: string,
        orgId: string
      ) => {
        try {
          await api.adjustStock(orgId, {
            product_id: productId,
            delta,
            reason,
          });
          // Refresh alerts after adjustment
          await get().loadInventoryAlerts(orgId);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      syncWithServer: async (orgId: string) => {
        set({ loading: true });
        try {
          await get().loadInventoryAlerts(orgId);
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      clearCache: () => {
        set({
          lowStockProducts: [],
          expiringProducts: [],
          lastSync: null,
          currentOrgId: null,
          error: null,
        });
      },

      setError: (error) => set({ error }),
    }),
    {
      name: "inventory-store",
      version: 1,
    }
  )
);
