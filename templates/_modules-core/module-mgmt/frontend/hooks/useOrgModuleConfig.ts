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
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

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

    try {
      const client = createCoraAuthenticatedClient(token);
      const data = await client.get<{ success: boolean; data: { modules: OrgModuleConfig[] } }>(`/admin/org/mgmt/modules?orgId=${orgId}`);

      // API returns: { success: true, data: { modules: [...] } }
      setModules(data?.data?.modules || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch modules";
      handleError(errorMessage);
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, handleError, isAuthenticated]);

  // Get single module with org-level resolution
  const getModule = useCallback(
    async (name: string): Promise<OrgModuleConfig | null> => {
      if (!isAuthenticated) return null;
      if (!orgId) return null;

      try {
        const client = createCoraAuthenticatedClient(token);
        const data = await client.get<{ success: boolean; data: { module: OrgModuleConfig } }>(`/admin/org/mgmt/modules/${name}?orgId=${orgId}`);

        // API returns: { success: true, data: { module: {...} } }
        return data?.data?.module || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch module";
        handleError(errorMessage);
        return null;
      }
    },
    [orgId, handleError, isAuthenticated]
  );

  // Update org-level module config
  const updateConfig = useCallback(
    async (
      name: string,
      updates: OrgModuleConfigUpdate
    ): Promise<boolean> => {
      if (!isAuthenticated) return false;
      if (!orgId) return false;

      try {
        const client = createCoraAuthenticatedClient(token);
        const data = await client.put<{ success: boolean; data: { module: OrgModuleConfig } }>(`/admin/org/mgmt/modules/${name}?orgId=${orgId}`, {
          org_id: orgId,
          is_enabled: updates.isEnabled,
          config_overrides: updates.configOverrides,
          feature_flag_overrides: updates.featureFlagOverrides,
        });

        // Update local state
        if (data?.data?.module) {
          setModules((prev: OrgModuleConfig[]) =>
            prev.map((m: OrgModuleConfig) =>
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
    [orgId, handleError, isAuthenticated]
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