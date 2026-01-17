/**
 * Module Voice - Configs Hook
 *
 * Hook for managing voice interview configurations.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type {
  VoiceConfig,
  CreateVoiceConfigRequest,
  UpdateVoiceConfigRequest,
} from "../types";
import * as api from "../lib/api";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseVoiceConfigsOptions {
  /** Organization ID (required) */
  orgId: string;
  /** Filter by interview type */
  interviewType?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Auto-load on mount (default: true) */
  autoLoad?: boolean;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseVoiceConfigsReturn {
  // === State ===
  /** List of configs */
  configs: VoiceConfig[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;

  // === Actions ===
  /** Refresh configs list */
  refresh: () => Promise<void>;
  /** Get config by ID */
  get: (configId: string) => Promise<VoiceConfig>;
  /** Create a new config */
  create: (input: CreateVoiceConfigRequest) => Promise<VoiceConfig>;
  /** Update a config */
  update: (configId: string, input: UpdateVoiceConfigRequest) => Promise<VoiceConfig>;
  /** Delete a config */
  remove: (configId: string) => Promise<void>;
  /** Toggle config active status */
  toggleActive: (configId: string, isActive: boolean) => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing voice interview configurations
 *
 * @example
 * ```tsx
 * function ConfigsList() {
 *   const { configs, loading, create, update, remove } = useVoiceConfigs({
 *     orgId: currentOrg.id,
 *   });
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <Button onClick={() => create({
 *         orgId,
 *         name: 'Technical Interview',
 *         interviewType: 'technical',
 *         configJson: { ... }
 *       })}>
 *         New Config
 *       </Button>
 *       {configs.map(config => (
 *         <ConfigCard key={config.id} config={config} onEdit={update} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoiceConfigs(options: UseVoiceConfigsOptions): UseVoiceConfigsReturn {
  const {
    orgId,
    interviewType,
    isActive,
    autoLoad = true,
  } = options;

  // Auth
  const { data: authSession } = useSession();
  const token = (authSession as { accessToken?: string } | null)?.accessToken ?? "";

  // State
  const [configs, setConfigs] = useState<VoiceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load configs
  const loadConfigs = useCallback(async () => {
    if (!token || !orgId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.listConfigs(token, {
        orgId,
        interviewType,
        isActive,
      });
      setConfigs(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load configs";
      setError(message);
      console.error("Failed to load voice configs:", err);
    } finally {
      setLoading(false);
    }
  }, [token, orgId, interviewType, isActive]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && token && orgId) {
      loadConfigs();
    }
  }, [autoLoad, token, orgId, loadConfigs]);

  // === Actions ===

  const refresh = useCallback(async () => {
    await loadConfigs();
  }, [loadConfigs]);

  const get = useCallback(async (configId: string): Promise<VoiceConfig> => {
    if (!token) throw new Error("Not authenticated");

    return api.getConfig(configId, token);
  }, [token]);

  const create = useCallback(async (input: CreateVoiceConfigRequest): Promise<VoiceConfig> => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    try {
      const config = await api.createConfig(token, input);
      setConfigs((prev) => [config, ...prev]);
      return config;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create config";
      setError(message);
      throw err;
    }
  }, [token]);

  const update = useCallback(async (
    configId: string,
    input: UpdateVoiceConfigRequest
  ): Promise<VoiceConfig> => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    try {
      const updated = await api.updateConfig(configId, token, input);
      setConfigs((prev) =>
        prev.map((c) => (c.id === configId ? updated : c))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update config";
      setError(message);
      throw err;
    }
  }, [token]);

  const remove = useCallback(async (configId: string) => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    try {
      await api.deleteConfig(configId, token);
      setConfigs((prev) => prev.filter((c) => c.id !== configId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete config";
      setError(message);
      throw err;
    }
  }, [token]);

  const toggleActive = useCallback(async (configId: string, isActive: boolean) => {
    if (!token) throw new Error("Not authenticated");

    try {
      const updated = await api.updateConfig(configId, token, { isActive });
      setConfigs((prev) =>
        prev.map((c) => (c.id === configId ? updated : c))
      );
    } catch (err) {
      console.error("Failed to toggle config active:", err);
      throw err;
    }
  }, [token]);

  return {
    // State
    configs,
    loading,
    error,

    // Actions
    refresh,
    get,
    create,
    update,
    remove,
    toggleActive,
  };
}

export default useVoiceConfigs;
