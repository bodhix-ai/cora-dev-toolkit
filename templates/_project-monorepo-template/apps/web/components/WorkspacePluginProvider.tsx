/**
 * Workspace Plugin Provider
 * 
 * Provider component that supplies workspace context to plugin modules.
 * This is the composition layer where apps/web provides workspace data
 * to plugins without them needing to import module-ws directly.
 * 
 * Sprint 2 Update: Integrated with module-mgmt to provide module availability checking.
 */

'use client';

import { ReactNode, useMemo } from 'react';
import { WorkspacePluginContextInstance, WorkspacePluginContext, ModuleConfig } from '@{{PROJECT_NAME}}/shared/workspace-plugin';
import { useWorkspaceModuleConfig } from '@{{PROJECT_NAME}}/module-mgmt';

/**
 * Workspace module data as returned by the module-mgmt API
 */
interface WorkspaceModuleData {
  name: string;
  displayName: string;
  isEnabled: boolean;
  isInstalled: boolean;
  systemEnabled?: boolean;
  orgEnabled?: boolean;
  wsEnabled?: boolean;
  config?: Record<string, any>;
  featureFlags?: Record<string, any>;
}

interface WorkspacePluginProviderProps {
  /**
   * Current workspace ID
   */
  workspaceId: string;

  /**
   * Workspace metadata (optional - for display purposes)
   */
  workspace?: WorkspacePluginContext['workspace'];

  /**
   * Navigation configuration
   */
  navigation: WorkspacePluginContext['navigation'];

  /**
   * Feature flags
   */
  features: WorkspacePluginContext['features'];

  /**
   * User's role in this workspace
   */
  userRole?: WorkspacePluginContext['userRole'];

  /**
   * Refresh callback (optional)
   */
  onRefresh?: () => Promise<void>;

  /**
   * Loading state (optional)
   */
  loading?: boolean;

  /**
   * Error state (optional)
   */
  error?: string | null;

  /**
   * Child components that will consume the workspace context
   */
  children: ReactNode;
}

/**
 * Workspace Plugin Provider
 * 
 * Wraps plugin components to provide workspace context via React Context.
 * 
 * @example
 * ```tsx
 * // In apps/web/app/ws/[id]/layout.tsx
 * import { WorkspacePluginProvider } from '@/components/WorkspacePluginProvider';
 * 
 * export default function WorkspaceLayout({ children, params }) {
 *   const { workspace } = useWorkspace(params.id);
 *   const { config } = useWorkspaceConfig();
 * 
 *   return (
 *     <WorkspacePluginProvider
 *       workspaceId={params.id}
 *       workspace={workspace}
 *       navigation={{
 *         labelSingular: config.navLabelSingular,
 *         labelPlural: config.navLabelPlural,
 *         icon: config.navIcon,
 *       }}
 *       features={{
 *         favoritesEnabled: config.enableFavorites,
 *         tagsEnabled: config.enableTags,
 *         colorCodingEnabled: config.enableColorCoding,
 *       }}
 *       userRole={workspace.userRole}
 *     >
 *       {children}
 *     </WorkspacePluginProvider>
 *   );
 * }
 * ```
 */
export function WorkspacePluginProvider({
  workspaceId,
  workspace,
  navigation,
  features,
  userRole,
  onRefresh,
  loading = false,
  error = null,
  children,
}: WorkspacePluginProviderProps) {
  // Fetch workspace-resolved module config (sys → org → ws cascade)
  const { modules, isLoading: modulesLoading, refreshModules } = useWorkspaceModuleConfig(
    workspaceId,
    { 
      autoFetch: true,
    }
  );

  // Compute module availability utilities
  const moduleAvailability = useMemo(() => {
    // Filter to modules that are enabled at the workspace level (after cascade)
    // API returns: name, isEnabled, isInstalled, systemEnabled, orgEnabled, wsEnabled
    const enabledModules = modules
      .filter((m) => m.isEnabled)
      .map((m) => m.name);
    
    return {
      /**
       * Check if a module is available (enabled after sys → org → ws cascade)
       */
      isModuleAvailable: (moduleName: string): boolean => {
        return enabledModules.includes(moduleName);
      },
      
      /**
       * Get module configuration (resolved from sys → org → ws cascade)
       */
      getModuleConfig: (moduleName: string): ModuleConfig | null => {
        const foundModule = modules.find((m) => m.name === moduleName);
        if (!foundModule) return null;

        return {
          name: foundModule.name,
          displayName: foundModule.displayName,
          isEnabled: foundModule.isEnabled,
          isInstalled: foundModule.isInstalled,
          config: foundModule.config || {},
          featureFlags: (foundModule.featureFlags || {}) as Record<string, boolean>,
        };
      },
      
      /**
       * List of enabled modules
       */
      enabledModules,
    };
  }, [modules]);

  const contextValue = {
    workspaceId,
    workspace,
    navigation,
    features,
    userRole,
    moduleAvailability,
    refresh: onRefresh || refreshModules,
    loading: loading || modulesLoading,
    error,
  };

  return (
    <WorkspacePluginContextInstance.Provider value={contextValue}>
      {children}
    </WorkspacePluginContextInstance.Provider>
  );
}
