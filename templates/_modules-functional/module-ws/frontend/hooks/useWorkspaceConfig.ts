/**
 * useWorkspaceConfig Hook
 *
 * Fetches and manages the workspace module configuration.
 * Used for navigation labels, feature flags, and defaults.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { createWorkspaceApiClient } from "../lib/api";
import type { WorkspaceConfig } from "../types";

export interface UseWorkspaceConfigOptions {
  /** Organization ID (optional - falls back to context) */
  orgId?: string;
}

export interface UseWorkspaceConfigReturn {
  /** Workspace configuration */
  config: WorkspaceConfig | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch configuration */
  refetch: () => Promise<void>;
  /** Update configuration (platform admin only) */
  updateConfig: (data: Partial<WorkspaceConfig>) => Promise<WorkspaceConfig | null>;
  /** Whether configuration is being saved */
  isSaving: boolean;
  /** Navigation label (singular) */
  navLabelSingular: string;
  /** Navigation label (plural) */
  navLabelPlural: string;
  /** Navigation icon */
  navIcon: string;
  /** Whether favorites feature is enabled */
  favoritesEnabled: boolean;
  /** Whether tags feature is enabled */
  tagsEnabled: boolean;
  /** Whether color coding feature is enabled */
  colorCodingEnabled: boolean;
  /** Default color for new workspaces */
  defaultColor: string;
}

export function useWorkspaceConfig(options: UseWorkspaceConfigOptions = {}): UseWorkspaceConfigReturn {
  const { orgId: providedOrgId } = options;
  
  const { data: session } = useSession();
  const { currentOrganization } = useOrganizationContext();
  const orgId = providedOrgId || currentOrganization?.orgId || "";
  
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      // orgId is optional for /ws/config (SYS route - platform-level config)
      const cfg = await client.getConfig(orgId || "");
      setConfig(cfg);
    } catch (err) {
      console.error("Failed to fetch workspace config:", err);
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, orgId]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update configuration
  const updateConfig = useCallback(
    async (data: Partial<WorkspaceConfig>): Promise<WorkspaceConfig | null> => {
      if (!session?.accessToken || !orgId) return null;

      setIsSaving(true);
      setError(null);

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        const updated = await client.updateConfig(data, orgId);
        setConfig(updated);
        return updated;
      } catch (err) {
        console.error("Failed to update workspace config:", err);
        setError(err instanceof Error ? err.message : "Failed to update configuration");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [session?.accessToken, orgId]
  );

  // Derived values with defaults
  const navLabelSingular = config?.navLabelSingular || "Workspace";
  const navLabelPlural = config?.navLabelPlural || "Workspaces";
  const navIcon = config?.navIcon || "Workspaces";
  const favoritesEnabled = config?.enableFavorites ?? true;
  const tagsEnabled = config?.enableTags ?? true;
  const colorCodingEnabled = config?.enableColorCoding ?? true;
  const defaultColor = config?.defaultColor || "#1976d2";

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
    updateConfig,
    isSaving,
    navLabelSingular,
    navLabelPlural,
    navIcon,
    favoritesEnabled,
    tagsEnabled,
    colorCodingEnabled,
    defaultColor,
  };
}

export default useWorkspaceConfig;
