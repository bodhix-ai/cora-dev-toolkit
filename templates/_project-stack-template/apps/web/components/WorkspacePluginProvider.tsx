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
    const enabledModules = modules
      .filter((m: any) => m.resolvedEnabled)
      .map((m: any) => m.moduleName);
    
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
        const module = modules.find((m: any) => m.moduleName === moduleName);
        if (!module) return null;
        
        return {
          name: module.moduleName,
          displayName: module.displayName,
          isEnabled: module.resolvedEnabled,
          isInstalled: module.systemInstalled,
          config: module.resolvedConfig,
          featureFlags: module.resolvedFeatureFlags,
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
