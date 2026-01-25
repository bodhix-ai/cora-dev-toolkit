/**
 * Workspace Plugin Provider
 * 
 * Provider component that supplies workspace context to plugin modules.
 * This is the composition layer where apps/web provides workspace data
 * to plugins without them needing to import module-ws directly.
 */

'use client';

import { ReactNode } from 'react';
import { WorkspacePluginContextInstance, WorkspacePluginContext } from '@{{PROJECT_NAME}}/shared/workspace-plugin';

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
  const contextValue = {
    workspaceId,
    workspace,
    navigation,
    features,
    userRole,
    refresh: onRefresh || (async () => {}),
    loading,
    error,
  };

  return (
    <WorkspacePluginContextInstance.Provider value={contextValue}>
      {children}
    </WorkspacePluginContextInstance.Provider>
  );
}