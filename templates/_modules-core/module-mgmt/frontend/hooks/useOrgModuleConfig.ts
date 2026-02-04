/**
 * useOrgModuleConfig Hook
 *
 * React hook for managing org-level module configuration.
 * Provides methods to list and update module configs with org-level overrides.
 *
 * @example
 * ```tsx
 * const { modules, updateConfig } = useOrgModuleConfig({ orgId: 'org-123' });
 *
 * // Update org-level module config
 * await updateConfig('module-kb', {
 *   isEnabled: true
 * });
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

// =============================================================================
// Types
// =============================================================================

export interface OrgModuleConfig {
  id: string | null;
  name: string;
  displayName: string;
  description?: string;
  type: "core" | "functional";
  tier: 1 | 2 | 3;
  // Enablement fields
  isEnabled: boolean;          // Resolved enablement (sys → org)
  isInstalled: boolean;        // System-level installation
  systemEnabled: boolean;      // System-level enablement
  orgEnabled: boolean | null;  // Org-level enablement
  // Configuration
  version: string | null;
  config: Record<string, unknown>;
  featureFlags: Record<string, unknown>;
  dependencies: string[];
  navConfig: Record<string, unknown>;
  requiredPermissions: string[];
  resolutionMetadata?: Record<string, unknown>;
}

export interface OrgModuleConfigUpdate {
  isEnabled?: boolean;
  configOverrides?: Record<string, unknown>;
  featureFlagOverrides?: Record<string, boolean>;
}

export interface UseOrgModuleConfigOptions {
  orgId: string | null;
  autoFetch?: boolean;
  onError?: (error: string) => void;
}

export interface UseOrgModuleConfigReturn {
  modules: OrgModuleConfig[];
  isLoading: boolean;
  error: string | null;
  refreshModules: () => Promise<void>;
  getModule: (name: string) => Promise<OrgModuleConfig | null>;
  updateConfig: (
    name: string,
    updates: OrgModuleConfigUpdate
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
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
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

export function useOrgModuleConfig(
  options: UseOrgModuleConfigOptions
): UseOrgModuleConfigReturn {
  const { orgId, autoFetch = true, onError } = options;

  // Authentication
  const { data: session, status } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const isAuthenticated = status === "authenticated" && !!token;

  // State
  const [modules, setModules] = useState<OrgModuleConfig[]>([]);
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

  // Fetch all modules with org-level resolution
  const refreshModules = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return;
    }

    if (!orgId) {
      setError("Organization ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await apiRequest<{
      modules: OrgModuleConfig[];
    }>(`/admin/org/mgmt/modules`, {
      headers: {
        'X-Org-Id': orgId
      }
    }, token);

    if (fetchError) {
      handleError(fetchError);
      setModules([]);
    } else if (data) {
      // API returns: { success: true, data: { modules: [...] } }
      const apiData = data as any;
      setModules(apiData?.data?.modules || []);
    }

    setIsLoading(false);
  }, [orgId, handleError, isAuthenticated, token]);

  // Get single module with org-level resolution
  const getModule = useCallback(
    async (name: string): Promise<OrgModuleConfig | null> => {
      if (!isAuthenticated) return null;
      if (!orgId) return null;

      const { data, error: fetchError } = await apiRequest<{
        module: OrgModuleConfig;
      }>(`/admin/org/mgmt/modules/${name}`, {
        headers: {
          'X-Org-Id': orgId
        }
      }, token);

      if (fetchError) {
        handleError(fetchError);
        return null;
      }

      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      return apiData?.data?.module || null;
    },
    [orgId, handleError, isAuthenticated, token]
  );

  // Update org-level module config
  const updateConfig = useCallback(
    async (
      name: string,
      updates: OrgModuleConfigUpdate
    ): Promise<boolean> => {
      if (!isAuthenticated) return false;
      if (!orgId) return false;

      const { data, error: updateError } = await apiRequest<{
        module: OrgModuleConfig;
      }>(
        `/admin/org/mgmt/modules/${name}`,
        {
          method: "PUT",
          headers: {
            'X-Org-Id': orgId
          },
          body: JSON.stringify({
            org_id: orgId,
            is_enabled: updates.isEnabled,
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
        setModules((prev: OrgModuleConfig[]) =>
          prev.map((m: OrgModuleConfig) =>
            m.name === name ? apiData.data.module : m
          )
        );
      }

      return true;
    },
    [orgId, handleError, isAuthenticated, token]
  );

  // Auto-fetch on mount or when orgId changes
  useEffect(() => {
    if (autoFetch && orgId) {
      refreshModules();
    }
  }, [autoFetch, orgId, refreshModules]);

  return {
    modules,
    isLoading,
    error,
    refreshModules,
    getModule,
    updateConfig,
  };
}

export default useOrgModuleConfig;