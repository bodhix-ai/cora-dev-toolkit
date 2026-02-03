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

// =============================================================================
// Types
// =============================================================================

export interface WorkspaceModuleConfig {
  moduleName: string;
  displayName: string;
  moduleType: "core" | "functional";
  tier: 1 | 2 | 3;
  // System-level config
  systemEnabled: boolean;
  systemInstalled: boolean;
  systemConfig: Record<string, unknown>;
  systemFeatureFlags: Record<string, boolean>;
  // Org-level overrides
  orgEnabled: boolean | null;
  orgConfigOverrides: Record<string, unknown> | null;
  orgFeatureFlagOverrides: Record<string, boolean> | null;
  // Workspace-level overrides
  wsConfigOverrides: Record<string, unknown> | null;
  wsFeatureFlagOverrides: Record<string, boolean> | null;
  // Resolved config (system + org + workspace cascade)
  resolvedEnabled: boolean;
  resolvedConfig: Record<string, unknown>;
  resolvedFeatureFlags: Record<string, boolean>;
}

export interface WorkspaceModuleConfigUpdate {
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
// API Client
// =============================================================================

const API_BASE_URL =
  typeof window !== "undefined"
    ? (window as any).NEXT_PUBLIC_CORA_API_URL ||
      process.env.NEXT_PUBLIC_CORA_API_URL ||
      ""
    : process.env.NEXT_PUBLIC_CORA_API_URL || "";

async function apiRequest<T>(
  workspaceId: string,
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = `${API_BASE_URL}/admin/ws/${workspaceId}/mgmt/modules${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error:
          json.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { data: json, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
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

    const { data, error: fetchError } = await apiRequest<{
      modules: WorkspaceModuleConfig[];
    }>(workspaceId, "", {}, token);

    if (fetchError) {
      handleError(fetchError);
      setModules([]);
    } else if (data) {
      // API returns: { success: true, data: { modules: [...] } }
      const apiData = data as any;
      setModules(apiData?.data?.modules || []);
    }

    setIsLoading(false);
  }, [workspaceId, handleError, isAuthenticated, token]);

  // Get single module with workspace-level resolution
  const getModule = useCallback(
    async (name: string): Promise<WorkspaceModuleConfig | null> => {
      if (!isAuthenticated) return null;
      if (!workspaceId) return null;

      const { data, error: fetchError } = await apiRequest<{
        module: WorkspaceModuleConfig;
      }>(workspaceId, `/${name}`, {}, token);

      if (fetchError) {
        handleError(fetchError);
        return null;
      }

      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      return apiData?.data?.module || null;
    },
    [workspaceId, handleError, isAuthenticated, token]
  );

  // Update workspace-level module config
  const updateConfig = useCallback(
    async (
      name: string,
      updates: WorkspaceModuleConfigUpdate
    ): Promise<boolean> => {
      if (!isAuthenticated) return false;
      if (!workspaceId) return false;

      const { data, error: updateError } = await apiRequest<{
        module: WorkspaceModuleConfig;
      }>(
        workspaceId,
        `/${name}`,
        {
          method: "PUT",
          body: JSON.stringify({
            config_overrides: updates.configOverrides,
            feature_flag_overrides: updates.featureFlagOverrides,
          }),
        },
        token
      );

      if (updateError) {
        handleError(updateError);
        return false;
      }

      // Update local state
      const apiData = data as any;
      if (apiData?.data?.module) {
        setModules((prev: WorkspaceModuleConfig[]) =>
          prev.map((m: WorkspaceModuleConfig) =>
            m.moduleName === name ? apiData.data.module : m
          )
        );
      }

      return true;
    },
    [workspaceId, handleError, isAuthenticated, token]
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