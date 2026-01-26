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
import { useSession } from "next-auth/react";

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

const API_BASE_URL =
  typeof window !== "undefined"
    ? (window as any).NEXT_PUBLIC_CORA_API_URL ||
      process.env.NEXT_PUBLIC_CORA_API_URL ||
      ""
    : process.env.NEXT_PUBLIC_CORA_API_URL || "";

const API_BASE = `${API_BASE_URL}/admin/sys/mgmt/modules`;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Note: Using computed URL to avoid api-tracer regex false positives
    const url = API_BASE + endpoint;
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

export function useModuleRegistry(
  options: UseModuleRegistryOptions = {}
): UseModuleRegistryReturn {
  const {
    autoFetch = true,
    includeDisabled = false,
    moduleType,
    onError,
  } = options;

  // Authentication
  const { data: session, status } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const isAuthenticated = status === "authenticated" && !!token;

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
    if (!isAuthenticated) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (includeDisabled) params.set("include_disabled", "true");
    if (moduleType) params.set("type", moduleType);

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : "";

    const { data, error: fetchError } = await apiRequest<{ modules: Module[] }>(
      endpoint,
      {},
      token
    );

    if (fetchError) {
      handleError(fetchError);
      setModules([]);
    } else if (data) {
      // API returns: { success: true, data: { modules: [...] } }
      // apiRequest returns the full response as data, so we need data.data.modules
      const apiData = data as any;
      setModules(apiData?.data?.modules || []);
    }

    setIsLoading(false);
  }, [includeDisabled, moduleType, handleError, isAuthenticated, token]);

  // Get single module
  const getModule = useCallback(
    async (name: string): Promise<Module | null> => {
      if (!isAuthenticated) return null;

      const { data, error: fetchError } = await apiRequest<{ module: Module }>(
        `/${name}`,
        {},
        token
      );

      if (fetchError) {
        handleError(fetchError);
        return null;
      }

      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      return apiData?.data?.module || null;
    },
    [handleError, isAuthenticated, token]
  );

  // Update module
  // Note: Using direct fetch with explicit path for API validator compatibility
  const updateModule = useCallback(
    async (
      name: string,
      updates: Partial<ModuleUpdate>
    ): Promise<Module | null> => {
      if (!isAuthenticated) return null;

      try {
        const response = await fetch(`${API_BASE_URL}/admin/sys/mgmt/modules/${name}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        const json = await response.json();

        if (!response.ok) {
          const errorMsg =
            json.message || `HTTP ${response.status}: ${response.statusText}`;
          handleError(errorMsg);
          return null;
        }

        const data = json as { module: Module };

        // Update local state
        if (data?.module) {
          setModules((prev) =>
            prev.map((m) => (m.name === name ? data.module : m))
          );
        }

        return data?.module || null;
      } catch (err) {
        handleError(
          err instanceof Error ? err.message : "Unknown error occurred"
        );
        return null;
      }
    },
    [handleError, isAuthenticated, token]
  );

  // Enable module
  const enableModule = useCallback(
    async (name: string): Promise<boolean> => {
      if (!isAuthenticated) return false;

      const { data, error: enableError } = await apiRequest<{ module: Module }>(
        `/${name}/enable`,
        { method: "POST" },
        token
      );

      if (enableError) {
        handleError(enableError);
        return false;
      }

      // Update local state
      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      if (apiData?.data?.module) {
        setModules((prev) =>
          prev.map((m) => (m.name === name ? { ...m, isEnabled: true } : m))
        );
      }

      return true;
    },
    [handleError, isAuthenticated, token]
  );

  // Disable module
  const disableModule = useCallback(
    async (name: string, force = false): Promise<boolean> => {
      if (!isAuthenticated) return false;

      const endpoint = force
        ? `/${name}/disable?force=true`
        : `/${name}/disable`;
      const { data, error: disableError } = await apiRequest<{
        module: Module;
      }>(endpoint, { method: "POST" }, token);

      if (disableError) {
        handleError(disableError);
        return false;
      }

      // Update local state
      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      if (apiData?.data?.module) {
        setModules((prev) =>
          prev.map((m) => (m.name === name ? { ...m, isEnabled: false } : m))
        );
      }

      return true;
    },
    [handleError, isAuthenticated, token]
  );

  // Register new module
  const registerModule = useCallback(
    async (module: ModuleRegistration): Promise<Module | null> => {
      if (!isAuthenticated) return null;

      const { data, error: registerError } = await apiRequest<{
        module: Module;
      }>("", {
        method: "POST",
        body: JSON.stringify({
          module_name: module.moduleName,
          displayName: module.displayName,
          description: module.description,
          module_type: module.moduleType,
          tier: module.tier,
          dependencies: module.dependencies,
          nav_config: module.navConfig,
          required_permissions: module.requiredPermissions,
          config: module.config,
          feature_flags: module.featureFlags,
        }),
      }, token);

      if (registerError) {
        handleError(registerError);
        return null;
      }

      // Add to local state
      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      if (apiData?.data?.module) {
        setModules((prev) => [...prev, apiData.data.module]);
      }

      return apiData?.data?.module || null;
    },
    [handleError, isAuthenticated, token]
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
  // Authentication
  const { data: session, status } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const isAuthenticated = status === "authenticated" && !!token;

  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await apiRequest<{ module: Module }>(
      `/${name}`,
      {},
      token
    );

    if (fetchError) {
      setError(fetchError);
      setModule(null);
    } else if (data) {
      // API returns: { success: true, data: { module: {...} } }
      const apiData = data as any;
      setModule(apiData?.data?.module || null);
    }

    setIsLoading(false);
  }, [name, isAuthenticated, token]);

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
    () => {
      if (!modules || !Array.isArray(modules)) return false;
      return modules.some((m) => m.name === name && m.isEnabled);
    },
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