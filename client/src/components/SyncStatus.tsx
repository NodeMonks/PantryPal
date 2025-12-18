import { useSyncManager } from "@/hooks/useSyncManager";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * SyncStatus Component
 * Displays offline/online status and pending changes
 */
export const SyncStatus = () => {
  const { user } = useAuth();
  const orgId = user?.org_id;

  if (!orgId) return null;

  const { isOnline, isSyncing, lastSyncTime, pendingChanges, manualSync } =
    useSyncManager(orgId);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-40">
      {/* Offline Banner */}
      {!isOnline && (
        <Alert variant="destructive" className="w-80">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <span>You're offline. Changes will sync when online.</span>
              {isSyncing && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Changes */}
      {pendingChanges > 0 && (
        <Alert
          variant="default"
          className="w-80 bg-yellow-50 border-yellow-200"
        >
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="flex justify-between items-center">
              <span>{pendingChanges} changes pending sync</span>
              <Button
                size="sm"
                variant="outline"
                onClick={manualSync}
                disabled={isSyncing}
                className="ml-2"
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Online Status */}
      {isOnline && pendingChanges === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <CheckCircle className="h-3 w-3 text-green-600" />
          <span>Synced {formatTime(lastSyncTime)}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={manualSync}
            disabled={isSyncing}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCw
              className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      )}
    </div>
  );
};
