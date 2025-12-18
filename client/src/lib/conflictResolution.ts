/**
 * Conflict Resolution Strategy
 * Handles divergence between client and server data
 */

export type ConflictResolutionStrategy =
  | "last-write-wins"
  | "server-wins"
  | "client-wins"
  | "merge";

export interface DataVersion {
  id: string;
  version: number;
  lastModified: number;
  lastModifiedBy?: string;
}

export interface ConflictMetadata {
  clientVersion: number;
  serverVersion: number;
  clientLastModified: number;
  serverLastModified: number;
  conflictTimestamp: number;
}

/**
 * Last-Write-Wins Strategy
 * Newer timestamp wins, regardless of source
 */
export const lastWriteWinsResolver = <T extends DataVersion>(
  clientData: T,
  serverData: T
): { resolved: T; metadata: ConflictMetadata } => {
  const metadata: ConflictMetadata = {
    clientVersion: clientData.version,
    serverVersion: serverData.version,
    clientLastModified: clientData.lastModified,
    serverLastModified: serverData.lastModified,
    conflictTimestamp: Date.now(),
  };

  const resolved =
    clientData.lastModified > serverData.lastModified ? clientData : serverData;

  return { resolved, metadata };
};

/**
 * Server-Wins Strategy
 * Server data always takes precedence
 */
export const serverWinsResolver = <T extends DataVersion>(
  clientData: T,
  serverData: T
): { resolved: T; metadata: ConflictMetadata } => {
  const metadata: ConflictMetadata = {
    clientVersion: clientData.version,
    serverVersion: serverData.version,
    clientLastModified: clientData.lastModified,
    serverLastModified: serverData.lastModified,
    conflictTimestamp: Date.now(),
  };

  return { resolved: serverData, metadata };
};

/**
 * Client-Wins Strategy
 * Client data always takes precedence
 */
export const clientWinsResolver = <T extends DataVersion>(
  clientData: T,
  serverData: T
): { resolved: T; metadata: ConflictMetadata } => {
  const metadata: ConflictMetadata = {
    clientVersion: clientData.version,
    serverVersion: serverData.version,
    clientLastModified: clientData.lastModified,
    serverLastModified: serverData.lastModified,
    conflictTimestamp: Date.now(),
  };

  return { resolved: clientData, metadata };
};

/**
 * Merge Strategy
 * Intelligently merges client and server data
 */
export const mergeResolver = <T extends Record<string, any> & DataVersion>(
  clientData: T,
  serverData: T
): { resolved: T; metadata: ConflictMetadata } => {
  const metadata: ConflictMetadata = {
    clientVersion: clientData.version,
    serverVersion: serverData.version,
    clientLastModified: clientData.lastModified,
    serverLastModified: serverData.lastModified,
    conflictTimestamp: Date.now(),
  };

  // For each field, use the newer version
  const merged: T = {
    ...serverData,
    ...Object.entries(clientData).reduce((acc, [key, value]) => {
      if (
        typeof clientData[key] === "object" &&
        clientData[key] !== null &&
        typeof serverData[key] === "object" &&
        serverData[key] !== null
      ) {
        // For objects, merge recursively
        acc[key as keyof T] = {
          ...(serverData[key as keyof T] as any),
          ...(clientData[key as keyof T] as any),
        };
      } else {
        // For primitives, take client value (most recent local edit)
        acc[key as keyof T] = value;
      }
      return acc;
    }, {} as T),
  };

  // Update version and timestamp
  merged.version = Math.max(clientData.version, serverData.version) + 1;
  merged.lastModified = Date.now();

  return { resolved: merged, metadata };
};

/**
 * Resolve conflicts based on strategy
 */
export const resolveConflict = <T extends DataVersion>(
  clientData: T,
  serverData: T,
  strategy: ConflictResolutionStrategy = "last-write-wins"
): { resolved: T; metadata: ConflictMetadata } => {
  switch (strategy) {
    case "server-wins":
      return serverWinsResolver(clientData, serverData);
    case "client-wins":
      return clientWinsResolver(clientData, serverData);
    case "merge":
      return mergeResolver(clientData, serverData);
    case "last-write-wins":
    default:
      return lastWriteWinsResolver(clientData, serverData);
  }
};

/**
 * Detect if conflict exists
 */
export const hasConflict = <T extends DataVersion>(
  clientData: T,
  serverData: T
): boolean => {
  // Conflict if versions differ and both have been modified
  return (
    clientData.version !== serverData.version &&
    clientData.lastModified > 0 &&
    serverData.lastModified > 0 &&
    clientData.lastModified !== serverData.lastModified
  );
};

/**
 * Create conflict log entry
 */
export interface ConflictLog {
  id: string;
  entityType: string;
  entityId: string;
  conflictMetadata: ConflictMetadata;
  strategy: ConflictResolutionStrategy;
  resolved: boolean;
  timestamp: number;
}

export const createConflictLog = (
  entityType: string,
  entityId: string,
  metadata: ConflictMetadata,
  strategy: ConflictResolutionStrategy
): ConflictLog => ({
  id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  entityType,
  entityId,
  conflictMetadata: metadata,
  strategy,
  resolved: true,
  timestamp: Date.now(),
});
