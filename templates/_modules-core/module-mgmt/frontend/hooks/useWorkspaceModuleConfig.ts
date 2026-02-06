/**
 * useWorkspaceModuleConfig Hook
 *
 * React hook for managing workspace-level module configuration.
 * Provides methods to list and update module configs with workspace-level overrides.
 *
 * @example
 * ```tsx
 * const { modules, updateConfig } = useWorkspaceModuleConfig('ws-123');
 *
 * // Update workspace-level module config
 * await updateConfig('module-kb', {
 *   configOverrides: { maxDocuments: 500 },
 *   featureFlagOverrides: { advancedSearch: false }
 * });
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

// =============================================================================
// Types
// =============================================================================

export interface WorkspaceModuleConfig {
  id: string | null;
  name: string;
  displayName: string;
  description?: string;
  type: "core" | "functional";
  tier: 1 | 2 | 3;
  // Enablement fields
  isEnabled: boolean;          // Resolved enablement (final cascade result)
  isInstalled: boolean;        // System-level installation
  systemEnabled: boolean;      // System-level enablement
  orgEnabled: boolean | null;  // Org-level enablement
  wsEnabled: boolean | null;   // Workspace-level enablement
  resolvedEnabled: boolean;    // Alias for isEnabled (for WorkspacePluginProvider)
  // Configuration
  version: string | null;
  config: Record<string, unknown>;
  featureFlags: Record<string, unknown>;
  dependencies: string[];
  navConfig: Record<string, unknown>;
  requiredPermissions: string[];
  resolutionMetadata?: Record<string, unknown>;
}

export interface WorkspaceModuleConfigUpdate {
  isEnabled?: boolean;
  configOverrides?: Record<string, unknown>;
  featureFlagOverrides?: Record<string, boolean>;
}

export interface UseWorkspaceModuleConfigOptions {
  autoFetch?: boolean;
  onError?: (error: string) => void;
}

export interface UseWorkspaceModuleConfigReturn {
  modules: WorkspaceModuleConfig[];
  isLoading: boolean;
  error: string | null;
  refreshModules: () => Promise<void>;
  getModule: (name: string) => Promise<WorkspaceModuleConfig | null>;
  updateConfig: (
    name: string,
    updates: WorkspaceModuleConfigUpdate
  ) => Promise<boolean>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWorkspaceModuleConfig(
  workspaceId: string,
  options: UseWorkspaceModuleConfigOptions = {}
): UseWorkspaceModuleConfigReturn {
  const { autoFetch = true, onError } = options;

  // Authentication
  const { data: session, status } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const isAuthenticated = status === "authenticated" && !!token;

  // State
  const [modules, setModules] = useState<WorkspaceModuleConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Error handler
  const handleError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage);
      onError?.(errorMessage);
    },
    [onError]
  );

  // Fetch all modules with workspace-level resolution
  const refreshModules = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return;
    }

    if (!workspaceId) {
      setError("Workspace ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = createCoraAuthenticatedClient(token);
      const data = await client.get<{ success: boolean; data: { modules: WorkspaceModuleConfig[] } }>(`/admin/ws/${workspaceId}/mgmt/modules`);

      // API returns: { success: true, data: { modules: [...] } }
      setModules(data?.data?.modules || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch modules";
      handleError(errorMessage);
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, handleError, isAuthenticated]);

  // Get single module with workspace-level resolution
  const getModule = useCallback(
    async (name: string): Promise<WorkspaceModuleConfig | null> => {
      if (!isAuthenticated) return null;
      if (!workspaceId) return null;

      try {
        const client = createCoraAuthenticatedClient(token);
        const data = await client.get<{ success: boolean; data: { module: WorkspaceModuleConfig } }>(`/admin/ws/${workspaceId}/mgmt/modules/${name}`);

        // API returns: { success: true, data: { module: {...} } }
        return data?.data?.module || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch module";
        handleError(errorMessage);
        return null;
      }
    },
    [workspaceId, handleError, isAuthenticated]
  );

  // Update workspace-level module config
  const updateConfig = useCallback(
    async (
      name: string,
      updates: WorkspaceModuleConfigUpdate
    ): Promise<boolean> => {
      if (!isAuthenticated) return false;
      if (!workspaceId) return false;

      try {
        const client = createCoraAuthenticatedClient(token);
        const data = await client.put<{ success: boolean; data: { module: WorkspaceModuleConfig } }>(`/admin/ws/${workspaceId}/mgmt/modules/${name}`, {
          is_enabled: updates.isEnabled,
          config_overrides: updates.configOverrides,
          feature_flag_overrides: updates.featureFlagOverrides,
        });

        // Update local state
        if (data?.data?.module) {
          setModules((prev: WorkspaceModuleConfig[]) =>
            prev.map((m: WorkspaceModuleConfig) =>
              m.name === name ? data.data.module : m
            )
          );
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update module config";
        handleError(errorMessage);
        return false;
      }
    },
    [workspaceId, handleError, isAuthenticated]
  );

  // Auto-fetch on mount or when workspaceId changes
  useEffect(() => {
    if (autoFetch && workspaceId) {
      refreshModules();
    }
  }, [autoFetch, workspaceId, refreshModules]);

  return {
    modules,
    isLoading,
    error,
    refreshModules,
    getModule,
    updateConfig,
  };
}

export default useWorkspaceModuleConfig;