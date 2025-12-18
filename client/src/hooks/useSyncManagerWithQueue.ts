import { useEffect, useState, useCallback } from "react";
import { useProductStore } from "@/stores/productStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useBillStore } from "@/stores/billStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import {
  useTransactionQueue,
  replayTransactions,
} from "@/stores/transactionQueue";
import { api } from "@/lib/api";

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  error?: string;
}

/**
 * Enhanced Sync Manager with Transaction Queue Support
 * Handles offline mutations, transaction replay, and automatic synchronization
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
  const transactionQueue = useTransactionQueue();

  // Calculate pending changes
  const calculatePendingChanges = useCallback(() => {
    const pendingTransactions = transactionQueue.getPending();
    return pendingTransactions.length;
  }, [transactionQueue]);

  // Replay offline transactions
  const replayOfflineTransactions = useCallback(async () => {
    const pending = transactionQueue.getPending();
    if (pending.length === 0) return { success: 0, failed: 0 };

    try {
      transactionQueue.setProcessing(true);

      const results = await replayTransactions(pending);

      // Process results
      let successCount = 0;
      let failedCount = 0;

      results.forEach((result, txId) => {
        if (result.success) {
          transactionQueue.updateTransaction(txId, { status: "synced" });
          successCount++;
        } else {
          transactionQueue.updateTransaction(txId, {
            status: "failed",
            error: result.error,
          });
          failedCount++;
        }
      });

      // Clear synced transactions
      transactionQueue.clearSynced();

      return { success: successCount, failed: failedCount };
    } finally {
      transactionQueue.setProcessing(false);
    }
  }, [transactionQueue]);

  // Handle online/offline transitions
  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true, isSyncing: true }));

      try {
        // First, replay any offline transactions
        const replayResults = await replayOfflineTransactions();

        if (replayResults.failed > 0) {
          setSyncStatus((prev) => ({
            ...prev,
            error: `${replayResults.failed} transactions failed to sync`,
          }));
        }

        // Then sync all stores
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
          pendingChanges: calculatePendingChanges(),
          error: undefined,
        }));
      } catch (error) {
        console.error("Sync error:", error);
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: (error as Error).message,
        }));
      }
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    // Attach event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic sync (every 30 seconds when online)
    const syncInterval = setInterval(() => {
      if (navigator.onLine && !syncStatus.isSyncing) {
        handleOnline();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(syncInterval);
    };
  }, [
    orgId,
    productStore,
    customerStore,
    billStore,
    inventoryStore,
    replayOfflineTransactions,
    calculatePendingChanges,
    syncStatus.isSyncing,
  ]);

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      await replayOfflineTransactions();

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
        pendingChanges: calculatePendingChanges(),
        error: undefined,
      }));
    } catch (error) {
      console.error("Manual sync error:", error);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: (error as Error).message,
      }));
    }
  }, [
    orgId,
    productStore,
    customerStore,
    billStore,
    inventoryStore,
    replayOfflineTransactions,
    calculatePendingChanges,
  ]);

  // Add transaction to queue when mutation fails offline
  const queueMutation = useCallback(
    (
      entityType: "product" | "customer" | "bill",
      transactionType: "CREATE" | "UPDATE" | "DELETE",
      payload: any,
      entityId?: string
    ) => {
      if (!syncStatus.isOnline) {
        const txId = transactionQueue.addTransaction(
          entityType,
          transactionType,
          payload,
          entityId
        );
        setSyncStatus((prev) => ({
          ...prev,
          pendingChanges: prev.pendingChanges + 1,
        }));
        return txId;
      }
      return null;
    },
    [syncStatus.isOnline, transactionQueue]
  );

  return {
    ...syncStatus,
    manualSync,
    queueMutation,
    pendingCount: transactionQueue.getPending().length,
  };
};
