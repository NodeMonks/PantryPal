import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export type TransactionType = "CREATE" | "UPDATE" | "DELETE";
export type EntityType = "product" | "customer" | "bill";

export interface QueuedTransaction {
  id: string;
  entityType: EntityType;
  transactionType: TransactionType;
  entityId?: string;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  status: "pending" | "processing" | "failed" | "synced";
}

interface TransactionQueueState {
  queue: QueuedTransaction[];
  processing: boolean;

  // Actions
  addTransaction: (
    entityType: EntityType,
    transactionType: TransactionType,
    payload: Record<string, any>,
    entityId?: string
  ) => string;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<QueuedTransaction>) => void;
  getQueue: () => QueuedTransaction[];
  getPending: () => QueuedTransaction[];
  clearSynced: () => void;
  clearAll: () => void;
  setProcessing: (processing: boolean) => void;
}

export const useTransactionQueue = create<TransactionQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      processing: false,

      addTransaction: (
        entityType: EntityType,
        transactionType: TransactionType,
        payload: Record<string, any>,
        entityId?: string
      ) => {
        const id = `tx_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const transaction: QueuedTransaction = {
          id,
          entityType,
          transactionType,
          entityId,
          payload,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          status: "pending",
        };

        set((state) => ({
          queue: [...state.queue, transaction],
        }));

        return id;
      },

      removeTransaction: (id: string) => {
        set((state) => ({
          queue: state.queue.filter((tx) => tx.id !== id),
        }));
      },

      updateTransaction: (id: string, updates: Partial<QueuedTransaction>) => {
        set((state) => ({
          queue: state.queue.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        }));
      },

      getQueue: () => get().queue,

      getPending: () =>
        get().queue.filter(
          (tx) => tx.status === "pending" || tx.status === "failed"
        ),

      clearSynced: () => {
        set((state) => ({
          queue: state.queue.filter((tx) => tx.status !== "synced"),
        }));
      },

      clearAll: () => {
        set({ queue: [], processing: false });
      },

      setProcessing: (processing: boolean) => {
        set({ processing });
      },
    }),
    {
      name: "transaction-queue",
      version: 1,
    }
  )
);

// Transaction replay logic - execute queued API calls
export const replayTransactions = async (
  queue: QueuedTransaction[]
): Promise<Map<string, { success: boolean; error?: string }>> => {
  const results = new Map<string, { success: boolean; error?: string }>();

  for (const transaction of queue) {
    if (transaction.status === "synced") continue;

    try {
      // Execute the appropriate API call based on transaction type
      if (transaction.entityType === "product") {
        if (transaction.transactionType === "CREATE") {
          await api.createProduct(transaction.payload);
        } else if (
          transaction.transactionType === "UPDATE" &&
          transaction.entityId
        ) {
          await api.updateProduct(transaction.entityId, transaction.payload);
        } else if (
          transaction.transactionType === "DELETE" &&
          transaction.entityId
        ) {
          await api.deleteProduct(transaction.entityId);
        }
      } else if (transaction.entityType === "customer") {
        if (transaction.transactionType === "CREATE") {
          await api.createCustomer(transaction.payload);
        } else if (
          transaction.transactionType === "UPDATE" &&
          transaction.entityId
        ) {
          await api.updateCustomer(transaction.entityId, transaction.payload);
        } else if (
          transaction.transactionType === "DELETE" &&
          transaction.entityId
        ) {
          await api.deleteCustomer(transaction.entityId);
        }
      } else if (transaction.entityType === "bill") {
        if (transaction.transactionType === "CREATE") {
          await api.createBill(transaction.payload);
        } else if (
          transaction.transactionType === "UPDATE" &&
          transaction.entityId
        ) {
          await api.updateBill(transaction.entityId, transaction.payload);
        } else if (
          transaction.transactionType === "DELETE" &&
          transaction.entityId
        ) {
          await api.deleteBill(transaction.entityId);
        }
      }

      results.set(transaction.id, { success: true });
    } catch (error) {
      const errorMsg = (error as Error).message;
      results.set(transaction.id, { success: false, error: errorMsg });
    }
  }

  return results;
};
