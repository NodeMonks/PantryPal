import { useEffect, useState, useCallback } from "react";
import { useProductStore } from "@/stores/productStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useBillStore } from "@/stores/billStore";
import { useInventoryStore } from "@/stores/inventoryStore";

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
}

/**
 * Hook to manage offline/online sync state and synchronization
 * Detects connection changes, manages pending updates, and syncs when reconnected
 */
export const useSyncManager = (orgId: string) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
  });

  const productStore = useProductStore();
  const customerStore = useCustomerStore();
  const billStore = useBillStore();
  const inventoryStore = useInventoryStore();

  // Handle online/offline transitions
  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true, isSyncing: true }));

      try {
        // Sync all stores when coming back online
        await Promise.all([
          productStore.syncWithServer(orgId),
          customerStore.syncWithServer(orgId),
          billStore.syncWithServer(orgId),
          billStore.syncPendingBills(orgId),
          inventoryStore.syncWithServer(orgId),
        ]);

        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: Date.now(),
          pendingChanges: 0,
        }));
      } catch (error) {
        console.error("Sync failed:", error);
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          pendingChanges: billStore.pendingSync.length,
        }));
      }
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [orgId, productStore, customerStore, billStore, inventoryStore]);

  // Periodic sync when online (every 30 seconds)
  useEffect(() => {
    if (!syncStatus.isOnline) return;

    const interval = setInterval(async () => {
      if (!syncStatus.isSyncing) {
        try {
          setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
          await Promise.all([
            productStore.syncWithServer(orgId),
            customerStore.syncWithServer(orgId),
            billStore.syncWithServer(orgId),
            inventoryStore.syncWithServer(orgId),
          ]);
          setSyncStatus((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncTime: Date.now(),
          }));
        } catch (error) {
          console.error("Background sync failed:", error);
          setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [
    syncStatus.isOnline,
    syncStatus.isSyncing,
    orgId,
    productStore,
    customerStore,
    billStore,
    inventoryStore,
  ]);

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      await Promise.all([
        productStore.syncWithServer(orgId),
        customerStore.syncWithServer(orgId),
        billStore.syncWithServer(orgId),
        billStore.syncPendingBills(orgId),
        inventoryStore.syncWithServer(orgId),
      ]);

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        pendingChanges: 0,
      }));
    } catch (error) {
      console.error("Manual sync failed:", error);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingChanges: billStore.pendingSync.length,
      }));
    }
  }, [
    orgId,
    productStore,
    customerStore,
    billStore,
    inventoryStore,
    syncStatus.isSyncing,
  ]);

  return {
    ...syncStatus,
    manualSync,
  };
};
