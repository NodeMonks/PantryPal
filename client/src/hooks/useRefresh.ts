import { useCallback, useState } from "react";
import { useProductStore } from "@/stores/productStore";
import { useBillStore } from "@/stores/billStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { queryClient } from "@/lib/queryClient";

export function useRefresh(orgId: string | undefined) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const productStore = useProductStore();
  const billStore = useBillStore();
  const customerStore = useCustomerStore();
  const inventoryStore = useInventoryStore();

  /**
   * Refreshes all Zustand stores and React Query caches in parallel.
   * Returns true if any store's lastSync timestamp advanced (new data arrived),
   * false if all were already up to date or the fetch failed.
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!orgId || isRefreshing) return false;

    // Snapshot timestamps before refresh
    const prevProduct = productStore.lastSync;
    const prevBill = billStore.lastSync;
    const prevCustomer = customerStore.lastSync;
    const prevInventory = inventoryStore.lastSync;

    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        productStore.loadProducts(orgId),
        billStore.loadBills(orgId),
        customerStore.loadCustomers(orgId),
        inventoryStore.loadInventoryAlerts(orgId),
      ]);

      // Invalidate React Query caches (Reports, QuickPOS, POSDashboard, etc.)
      await queryClient.invalidateQueries();

      // Detect whether any store received fresh data
      const hasNewData =
        productStore.lastSync !== prevProduct ||
        billStore.lastSync !== prevBill ||
        customerStore.lastSync !== prevCustomer ||
        inventoryStore.lastSync !== prevInventory;

      return hasNewData;
    } finally {
      setIsRefreshing(false);
    }
  }, [
    orgId,
    isRefreshing,
    productStore,
    billStore,
    customerStore,
    inventoryStore,
  ]);

  return { refresh, isRefreshing };
}
