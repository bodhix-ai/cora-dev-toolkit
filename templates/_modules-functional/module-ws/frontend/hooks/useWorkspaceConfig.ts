/**
 * useWorkspaceConfig Hook
 *
 * Fetches and manages the workspace module configuration.
 * Used for navigation labels, feature flags, and defaults.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { createWorkspaceApiClient } from "../lib/api";
import type { WorkspaceConfig } from "../types";

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

export function useWorkspaceConfig(): UseWorkspaceConfigReturn {
  const { data: session } = useSession();
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
      const cfg = await client.getConfig();
      setConfig(cfg);
    } catch (err) {
      console.error("Failed to fetch workspace config:", err);
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update configuration
  const updateConfig = useCallback(
    async (data: Partial<WorkspaceConfig>): Promise<WorkspaceConfig | null> => {
      if (!session?.accessToken) return null;

      setIsSaving(true);
      setError(null);

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        const updated = await client.updateConfig(data);
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
    [session?.accessToken]
  );

  // Derived values with defaults
  const navLabelSingular = config?.nav_label_singular || "Workspace";
  const navLabelPlural = config?.nav_label_plural || "Workspaces";
  const navIcon = config?.nav_icon || "Workspaces";
  const favoritesEnabled = config?.enable_favorites ?? true;
  const tagsEnabled = config?.enable_tags ?? true;
  const colorCodingEnabled = config?.enable_color_coding ?? true;
  const defaultColor = config?.default_color || "#1976d2";

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
