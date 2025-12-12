/**
 * useModuleRegistry Hook
 *
 * React hook for interacting with the CORA Module Registry.
 * Provides methods to list, get, update, enable, and disable modules.
 *
 * @example
 * ```tsx
 * const { modules, isLoading, enableModule, disableModule } = useModuleRegistry();
 *
 * // Enable a module
 * await enableModule('module-kb');
 *
 * // Get enabled modules for navigation
 * const navModules = modules.filter(m => m.isEnabled);
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export interface Module {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: "core" | "functional";
  tier: 1 | 2 | 3;
  isEnabled: boolean;
  isInstalled: boolean;
  version: string | null;
  minCompatibleVersion: string | null;
  config: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
  dependencies: string[];
  navConfig: ModuleNavConfig;
  requiredPermissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ModuleNavConfig {
  route?: string;
  icon?: string;
  label?: string;
  order?: number;
  adminOnly?: boolean;
  children?: ModuleNavConfig[];
}

export interface ModuleRegistryState {
  modules: Module[];
  isLoading: boolean;
  error: string | null;
}

export interface ModuleRegistryActions {
  refreshModules: () => Promise<void>;
  getModule: (name: string) => Promise<Module | null>;
  updateModule: (
    name: string,
    updates: Partial<ModuleUpdate>
  ) => Promise<Module | null>;
  enableModule: (name: string) => Promise<boolean>;
  disableModule: (name: string, force?: boolean) => Promise<boolean>;
  registerModule: (module: ModuleRegistration) => Promise<Module | null>;
}

export interface ModuleUpdate {
  displayName: string;
  description: string;
  config: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
  navConfig: ModuleNavConfig;
  requiredPermissions: string[];
  version: string;
}

export interface ModuleRegistration {
  moduleName: string;
  displayName: string;
  description?: string;
  moduleType?: "core" | "functional";
  tier?: 1 | 2 | 3;
  dependencies?: string[];
  navConfig?: ModuleNavConfig;
  requiredPermissions?: string[];
  config?: Record<string, unknown>;
  featureFlags?: Record<string, boolean>;
}

export interface UseModuleRegistryOptions {
  autoFetch?: boolean;
  includeDisabled?: boolean;
  moduleType?: "core" | "functional";
  onError?: (error: string) => void;
}

export type UseModuleRegistryReturn = ModuleRegistryState &
  ModuleRegistryActions;

// =============================================================================
// API Client
// =============================================================================

const API_BASE = "/api/platform/modules";

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
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

export function useModuleRegistry(
  options: UseModuleRegistryOptions = {}
): UseModuleRegistryReturn {
  const {
    autoFetch = true,
    includeDisabled = false,
    moduleType,
    onError,
  } = options;

  // State
  const [modules, setModules] = useState<Module[]>([]);
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

  // Fetch all modules
  const refreshModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (includeDisabled) params.set("include_disabled", "true");
    if (moduleType) params.set("type", moduleType);

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : "";

    const { data, error: fetchError } = await apiRequest<{ modules: Module[] }>(
      endpoint
    );

    if (fetchError) {
      handleError(fetchError);
      setModules([]);
    } else if (data) {
      setModules(data.modules);
    }

    setIsLoading(false);
  }, [includeDisabled, moduleType, handleError]);

  // Get single module
  const getModule = useCallback(
    async (name: string): Promise<Module | null> => {
      const { data, error: fetchError } = await apiRequest<{ module: Module }>(
        `/${name}`
      );

      if (fetchError) {
        handleError(fetchError);
        return null;
      }

      return data?.module || null;
    },
    [handleError]
  );

  // Update module
  const updateModule = useCallback(
    async (
      name: string,
      updates: Partial<ModuleUpdate>
    ): Promise<Module | null> => {
      const { data, error: updateError } = await apiRequest<{ module: Module }>(
        `/${name}`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        }
      );

      if (updateError) {
        handleError(updateError);
        return null;
      }

      // Update local state
      if (data?.module) {
        setModules((prev) =>
          prev.map((m) => (m.name === name ? data.module : m))
        );
      }

      return data?.module || null;
    },
    [handleError]
  );

  // Enable module
  const enableModule = useCallback(
    async (name: string): Promise<boolean> => {
      const { data, error: enableError } = await apiRequest<{ module: Module }>(
        `/${name}/enable`,
        { method: "POST" }
      );

      if (enableError) {
        handleError(enableError);
        return false;
      }

      // Update local state
      if (data?.module) {
        setModules((prev) =>
          prev.map((m) => (m.name === name ? { ...m, isEnabled: true } : m))
        );
      }

      return true;
    },
    [handleError]
  );

  // Disable module
  const disableModule = useCallback(
    async (name: string, force = false): Promise<boolean> => {
      const endpoint = force
        ? `/${name}/disable?force=true`
        : `/${name}/disable`;
      const { data, error: disableError } = await apiRequest<{
        module: Module;
      }>(endpoint, { method: "POST" });

      if (disableError) {
        handleError(disableError);
        return false;
      }

      // Update local state
      if (data?.module) {
        setModules((prev) =>
          prev.map((m) => (m.name === name ? { ...m, isEnabled: false } : m))
        );
      }

      return true;
    },
    [handleError]
  );

  // Register new module
  const registerModule = useCallback(
    async (module: ModuleRegistration): Promise<Module | null> => {
      const { data, error: registerError } = await apiRequest<{
        module: Module;
      }>("", {
        method: "POST",
        body: JSON.stringify({
          module_name: module.moduleName,
          display_name: module.displayName,
          description: module.description,
          module_type: module.moduleType,
          tier: module.tier,
          dependencies: module.dependencies,
          nav_config: module.navConfig,
          required_permissions: module.requiredPermissions,
          config: module.config,
          feature_flags: module.featureFlags,
        }),
      });

      if (registerError) {
        handleError(registerError);
        return null;
      }

      // Add to local state
      if (data?.module) {
        setModules((prev) => [...prev, data.module]);
      }

      return data?.module || null;
    },
    [handleError]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refreshModules();
    }
  }, [autoFetch, refreshModules]);

  return {
    modules,
    isLoading,
    error,
    refreshModules,
    getModule,
    updateModule,
    enableModule,
    disableModule,
    registerModule,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to get only enabled modules for navigation
 */
export function useEnabledModules(): {
  modules: Module[];
  isLoading: boolean;
  error: string | null;
} {
  const { modules, isLoading, error } = useModuleRegistry({
    autoFetch: true,
    includeDisabled: false,
  });

  const enabledModules = useMemo(
    () => modules.filter((m) => m.isEnabled && m.isInstalled),
    [modules]
  );

  return { modules: enabledModules, isLoading, error };
}

/**
 * Hook to get a single module by name
 */
export function useModule(name: string): {
  module: Module | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await apiRequest<{ module: Module }>(
      `/${name}`
    );

    if (fetchError) {
      setError(fetchError);
      setModule(null);
    } else if (data) {
      setModule(data.module);
    }

    setIsLoading(false);
  }, [name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { module, isLoading, error, refresh };
}

/**
 * Hook to check if a specific module is enabled
 */
export function useModuleEnabled(name: string): boolean {
  const { modules } = useModuleRegistry({ autoFetch: true });
  return useMemo(
    () => modules.some((m) => m.name === name && m.isEnabled),
    [modules, name]
  );
}

/**
 * Hook to get navigation items from enabled modules
 */
export function useModuleNavigation(): {
  navItems: Array<ModuleNavConfig & { moduleName: string }>;
  isLoading: boolean;
} {
  const { modules, isLoading } = useEnabledModules();

  const navItems = useMemo(() => {
    return modules
      .filter((m) => m.navConfig?.route)
      .map((m) => ({
        ...m.navConfig,
        moduleName: m.name,
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [modules]);

  return { navItems, isLoading };
}

export default useModuleRegistry;
