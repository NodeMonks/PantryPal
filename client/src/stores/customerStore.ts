import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cache } from "@/lib/indexeddb";
import { api, type Customer } from "@/lib/api";

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  lastSync: number | null;
  currentOrgId: string | null;

  // Actions
  loadCustomers: (orgId: string) => Promise<void>;
  createCustomer: (
    customer: Omit<Customer, "id" | "created_at">,
  ) => Promise<Customer>;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  deleteCustomer: (customerId: string) => void;
  searchCustomers: (query: string) => Customer[];
  syncWithServer: (orgId: string) => Promise<void>;
  clearCache: () => void;
  setError: (error: string | null) => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      loading: false,
      error: null,
      lastSync: null,
      currentOrgId: null,

      loadCustomers: async (orgId: string) => {
        set({ loading: true, currentOrgId: orgId });
        try {
          // Always fetch from server for accurate data; IndexedDB is for offline lookup only.
          const response = await api.getCustomers(orgId);
          set({
            customers: response,
            loading: false,
            error: null,
            lastSync: Date.now(),
          });

          // Cache in IndexedDB
          const cached_items = response.map((c: Customer) => ({
            id: c.id,
            orgId,
            storeId: orgId,
            name: c.name,
            phone: c.phone,
            updatedAt: Date.now(),
          }));
          await cache.putCustomers(cached_items);
        } catch (error) {
          const message =
            (error as Error).message || "Failed to load customers";
          set({ error: message, loading: false });
        }
      },

      createCustomer: async (customer: Omit<Customer, "id" | "created_at">) => {
        try {
          const newCustomer = await api.createCustomer(customer);
          const state = get();
          set({ customers: [...state.customers, newCustomer] });

          // Cache the new customer
          await cache.putCustomers([
            {
              id: newCustomer.id,
              orgId: state.currentOrgId || "",
              storeId: state.currentOrgId || "",
              name: newCustomer.name,
              phone: newCustomer.phone,
              updatedAt: Date.now(),
            },
          ]);

          return newCustomer;
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      addCustomer: (customer: Customer) => {
        const state = get();
        const updated = [...state.customers, customer];
        set({ customers: updated });
      },

      updateCustomer: (customerId: string, updates: Partial<Customer>) => {
        const state = get();
        const updated = state.customers.map((c) =>
          c.id === customerId ? { ...c, ...updates } : c,
        );
        set({ customers: updated });
      },

      deleteCustomer: (customerId: string) => {
        const state = get();
        const updated = state.customers.filter((c) => c.id !== customerId);
        set({ customers: updated });
      },

      searchCustomers: (query: string) => {
        const state = get();
        const lower = query.toLowerCase();
        return state.customers.filter(
          (c) =>
            c.name.toLowerCase().includes(lower) ||
            (c.email && c.email.toLowerCase().includes(lower)) ||
            (c.phone && c.phone.includes(query)),
        );
      },

      syncWithServer: async (orgId: string) => {
        set({ loading: true });
        try {
          const response = await api.getCustomers(orgId);
          set({
            customers: response,
            loading: false,
            lastSync: Date.now(),
            error: null,
          });

          // Update cache
          const cached_items = response.map((c: Customer) => ({
            id: c.id,
            orgId,
            storeId: orgId,
            name: c.name,
            phone: c.phone,
            updatedAt: Date.now(),
          }));
          await cache.putCustomers(cached_items);
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      clearCache: () => {
        set({ customers: [], lastSync: null, currentOrgId: null, error: null });
        cache.clearStore("customers");
      },

      setError: (error) => set({ error }),
    }),
    {
      name: "customer-store",
      version: 1,
    },
  ),
);
