/**
 * Workspace Plugin Types
 * 
 * These types define the contract between the workspace host (module-ws) and
 * workspace-aware plugins (kb, chat, eval, voice).
 * 
 * This interface avoids direct cross-module imports that cause type-checking failures.
 */

/**
 * Workspace Plugin Context
 * 
 * Interface provided by the workspace host (module-ws) and consumed by
 * workspace-aware plugins (kb, chat, eval, voice).
 * 
 * This interface is the contract between host and plugins, avoiding
 * direct cross-module imports that cause type-checking failures.
 */
export interface WorkspacePluginContext {
  /**
   * Current workspace ID
   */
  workspaceId: string;

  /**
   * Workspace metadata (optional - for display purposes)
   */
  workspace?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };

  /**
   * Navigation configuration
   */
  navigation: {
    labelSingular: string;
    labelPlural: string;
    icon: string;
  };

  /**
   * Feature flags
   */
  features: {
    favoritesEnabled: boolean;
    tagsEnabled: boolean;
    colorCodingEnabled: boolean;
  };

  /**
   * User's role in this workspace
   */
  userRole?: 'ws_owner' | 'ws_admin' | 'ws_user';
}

/**
 * React Context for workspace plugin integration
 */
export interface WorkspacePluginContextValue extends WorkspacePluginContext {
  /**
   * Refresh workspace data
   */
  refresh: () => Promise<void>;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error state
   */
  error: string | null;
}