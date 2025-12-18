import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cache, type BillCache, type TenantScope } from "@/lib/indexeddb";
import { api, type Bill } from "@/lib/api";

interface BillState {
  bills: Bill[];
  loading: boolean;
  error: string | null;
  lastSync: number | null;
  currentOrgId: string | null;
  pendingSync: Bill[]; // Bills created offline

  // Actions
  loadBills: (orgId: string) => Promise<void>;
  createBill: (bill: Omit<Bill, "id" | "created_at">) => Promise<Bill>;
  addBill: (bill: Bill) => void;
  updateBill: (billId: string, updates: Partial<Bill>) => void;
  deleteBill: (billId: string) => void;
  searchBills: (query: string) => Bill[];
  syncWithServer: (orgId: string) => Promise<void>;
  syncPendingBills: (orgId: string) => Promise<void>;
  clearCache: () => void;
  setError: (error: string | null) => void;
}

export const useBillStore = create<BillState>()(
  persist(
    (set, get) => ({
      bills: [],
      loading: false,
      error: null,
      lastSync: null,
      currentOrgId: null,
      pendingSync: [],

      loadBills: async (orgId: string) => {
        set({ loading: true, currentOrgId: orgId });
        try {
          // Try to load from IndexedDB first
          const cached = await cache.getBills({ orgId, storeId: orgId });
          if (cached.length > 0) {
            const bills: Bill[] = cached.map((c: BillCache) => ({
              id: c.id,
              bill_number: "",
              customer_id: null,
              total_amount: "0",
              discount_amount: null,
              tax_amount: null,
              final_amount: c.total.toString(),
              payment_method: null,
              created_at: new Date(c.createdAt).toISOString(),
            }));
            set({ bills, loading: false, error: null });
          }

          // Fetch from server
          const response = await api.getBills(orgId);
          set({
            bills: response,
            loading: false,
            error: null,
            lastSync: Date.now(),
          });

          // Cache in IndexedDB
          const cached_items = response.map((b: Bill) => ({
            id: b.id,
            orgId,
            storeId: orgId,
            total: parseFloat(b.final_amount),
            createdAt: Date.now(),
          }));
          await cache.putBills(cached_items);
        } catch (error) {
          const message = (error as Error).message || "Failed to load bills";
          set({ error: message, loading: false });
        }
      },

      createBill: async (billData: Omit<Bill, "id" | "created_at">) => {
        try {
          const newBill = await api.createBill(billData);
          const state = get();
          set({ bills: [...state.bills, newBill] });
          return newBill;
        } catch (error) {
          // If offline, store for later sync
          const offlineBill: Bill = {
            id: `offline-${Date.now()}`,
            ...billData,
            created_at: new Date().toISOString(),
          };
          const state = get();
          set({
            bills: [...state.bills, offlineBill],
            pendingSync: [...state.pendingSync, offlineBill],
          });
          throw error;
        }
      },

      addBill: (bill: Bill) => {
        const state = get();
        const updated = [...state.bills, bill];
        set({ bills: updated });
      },

      updateBill: (billId: string, updates: Partial<Bill>) => {
        const state = get();
        const updated = state.bills.map((b) =>
          b.id === billId ? { ...b, ...updates } : b
        );
        set({ bills: updated });
      },

      deleteBill: (billId: string) => {
        const state = get();
        const updated = state.bills.filter((b) => b.id !== billId);
        set({ bills: updated });
      },

      searchBills: (query: string) => {
        const state = get();
        const lower = query.toLowerCase();
        return state.bills.filter(
          (b) =>
            b.bill_number.toLowerCase().includes(lower) ||
            b.id.toLowerCase().includes(lower)
        );
      },

      syncWithServer: async (orgId: string) => {
        set({ loading: true });
        try {
          const response = await api.getBills(orgId);
          set({
            bills: response,
            loading: false,
            lastSync: Date.now(),
            error: null,
          });

          // Update cache
          const cached_items = response.map((b: Bill) => ({
            id: b.id,
            orgId,
            storeId: orgId,
            total: parseFloat(b.final_amount),
            createdAt: Date.now(),
          }));
          await cache.putBills(cached_items);
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      syncPendingBills: async (orgId: string) => {
        const state = get();
        if (state.pendingSync.length === 0) return;

        set({ loading: true });
        try {
          // Retry syncing pending bills
          for (const bill of state.pendingSync) {
            try {
              await api.createBill(bill);
            } catch (err) {
              console.error(`Failed to sync bill ${bill.id}:`, err);
            }
          }

          // Reload bills after sync
          await get().syncWithServer(orgId);
          set({ pendingSync: [], error: null });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      clearCache: () => {
        set({
          bills: [],
          lastSync: null,
          currentOrgId: null,
          error: null,
          pendingSync: [],
        });
        cache.clearStore("bills");
      },

      setError: (error) => set({ error }),
    }),
    {
      name: "bill-store",
      version: 1,
    }
  )
);
