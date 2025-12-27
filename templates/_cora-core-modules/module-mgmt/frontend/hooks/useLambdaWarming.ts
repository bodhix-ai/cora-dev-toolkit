/**
 * Lambda Management Module - Lambda Warming Hook
 *
 * React hook for managing Lambda warming configuration state.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { createLambdaMgmtClient } from "../lib/api";
import type { LambdaWarmingConfig, LambdaConfig } from "../types";
import { DEFAULT_WARMING_CONFIG } from "../types";

interface UseLambdaWarmingReturn {
  config: LambdaWarmingConfig | null;
  rawConfig: LambdaConfig | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateConfig: (config: LambdaWarmingConfig) => Promise<boolean>;
  toggleEnabled: (enabled: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Lambda warming configuration
 *
 * Provides methods to fetch, update, and toggle Lambda warming configuration.
 * Automatically handles loading states and error handling.
 *
 * @param authAdapter - CORA authentication adapter from useUser() context
 * @returns Lambda warming state and methods
 *
 * @example
 * ```tsx
 * import { useUser } from '@{{PROJECT_NAME}}/org-module-frontend';
 *
 * function MyComponent() {
 *   const { authAdapter } = useUser();
 *   const { config, loading, updateConfig, toggleEnabled } = useLambdaWarming(authAdapter);
 *
 *   if (loading) return <CircularProgress />;
 *
 *   return (
 *     <Switch
 *       checked={config?.enabled || false}
 *       onChange={(e) => toggleEnabled(e.target.checked)}
 *       aria-label="Enable Lambda warming"
 *     />
 *   );
 * }
 * ```
 */
export function useLambdaWarming(
  authAdapter: CoraAuthAdapter
): UseLambdaWarmingReturn {
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<LambdaWarmingConfig | null>(null);
  const [rawConfig, setRawConfig] = useState<LambdaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from authAdapter
  useEffect(() => {
    let mounted = true;

    authAdapter.getToken().then((t) => {
      if (mounted) {
        setToken(t);
        if (!t) {
          setError("Authentication required");
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [authAdapter]);

  // Create client with token - memoized to prevent infinite re-renders
  const client = useMemo(() => {
    return token ? createLambdaMgmtClient(token) : null;
  }, [token]);

  /**
   * Fetch Lambda warming configuration from API
   */
  const fetchConfig = useCallback(async () => {
    if (!client) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await client.getConfig("lambda_warming");

      if (response) {
        setRawConfig(response);
        const warmingConfig = response.config_value as LambdaWarmingConfig;
        setConfig(warmingConfig);
      } else {
        // No config exists yet - use default
        setRawConfig(null);
        setConfig(DEFAULT_WARMING_CONFIG);
      }
    } catch (err) {
      console.error("Failed to fetch Lambda warming config:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load configuration"
      );
      setConfig(DEFAULT_WARMING_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Update Lambda warming configuration
   *
   * @param newConfig - The new configuration to save
   * @returns True if successful, false otherwise
   */
  const updateConfig = useCallback(
    async (newConfig: LambdaWarmingConfig): Promise<boolean> => {
      if (!client) {
        setError("Not authenticated");
        return false;
      }

      try {
        setSaving(true);
        setError(null);

        const response = await client.updateWarmingConfig(newConfig);

        if (response) {
          setRawConfig(response);
          setConfig(response.config_value as LambdaWarmingConfig);
          return true;
        }

        return false;
      } catch (err) {
        console.error("Failed to update Lambda warming config:", err);
        setError(
          err instanceof Error ? err.message : "Failed to update configuration"
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [client]
  );

  /**
   * Toggle Lambda warming enabled/disabled
   *
   * @param enabled - Whether to enable or disable warming
   * @returns True if successful, false otherwise
   */
  const toggleEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!config) {
        console.error("Cannot toggle enabled - no config loaded");
        return false;
      }

      const updatedConfig: LambdaWarmingConfig = {
        ...config,
        enabled,
      };

      return updateConfig(updatedConfig);
    },
    [config, updateConfig]
  );

  /**
   * Manually refresh the configuration from the API
   */
  const refresh = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Initial load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    rawConfig,
    loading,
    saving,
    error,
    updateConfig,
    toggleEnabled,
    refresh,
  };
}

export default useLambdaWarming;
