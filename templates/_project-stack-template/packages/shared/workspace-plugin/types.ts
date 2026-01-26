/**
 * Workspace Plugin Types
 * 
 * These types define the contract between the workspace host (module-ws) and
 * workspace-aware plugins (kb, chat, eval, voice).
 * 
 * This interface avoids direct cross-module imports that cause type-checking failures.
 */

/**
 * Module configuration from sys_module_registry
 * 
 * Represents a module's current configuration and status in the system.
 */
export interface ModuleConfig {
  name: string;
  displayName: string;
  isEnabled: boolean;
  isInstalled: boolean;
  config: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
}

/**
 * Module availability utilities
 * 
 * Provides methods to check module availability and retrieve module configuration.
 * Module availability is determined by: is_installed AND is_enabled from sys_module_registry.
 */
export interface ModuleAvailability {
  /**
   * Check if a module is available (installed AND enabled)
   * 
   * @param moduleName - The module name (e.g., 'module-kb', 'module-chat')
   * @returns true if module is both installed and enabled
   */
  isModuleAvailable: (moduleName: string) => boolean;
  
  /**
   * Get module configuration
   * 
   * @param moduleName - The module name (e.g., 'module-kb', 'module-chat')
   * @returns Module configuration or null if module not found
   */
  getModuleConfig: (moduleName: string) => ModuleConfig | null;
  
  /**
   * List of enabled modules
   * 
   * Array of module names that are both installed and enabled.
   */
  enabledModules: string[];
}

/**
 * Config resolution (future: org/workspace overrides)
 * 
 * Represents the cascading configuration from system → org → workspace.
 * Currently only systemConfig is implemented; org and workspace overrides are placeholders.
 */
export interface ModuleConfigResolution {
  systemConfig: ModuleConfig;
  orgOverride?: Partial<ModuleConfig>; // Future: org-level config overrides
  workspaceOverride?: Partial<ModuleConfig>; // Future: workspace-level config overrides
  resolved: ModuleConfig;
}

/**
 * Future: Org-level module configuration overrides
 * 
 * Orgs can override system-level module configs.
 * For now, this is a placeholder for future implementation.
 * 
 * @future Will integrate with licensing/paywall system
 */
export interface OrgModuleConfig {
  orgId: string;
  moduleName: string;
  isEnabled: boolean; // Org can disable modules for their org
  config?: Record<string, unknown>; // Org-specific config overrides
  featureFlags?: Record<string, boolean>; // Org-specific feature flags
}

/**
 * Future: Workspace-level module configuration overrides
 * 
 * Workspaces can override org/system-level module configs.
 * For now, this is a placeholder for future implementation.
 * 
 * @future Cannot enable if org/system disabled; inherits from org → system cascade
 */
export interface WorkspaceModuleConfig {
  workspaceId: string;
  moduleName: string;
  config?: Record<string, unknown>; // Workspace-specific config overrides
  featureFlags?: Record<string, boolean>; // Workspace-specific feature flags
}

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

  /**
   * Module availability (from sys_module_registry)
   * 
   * Provides utilities to check if modules are available and retrieve their configuration.
   * Module availability is determined by: is_installed AND is_enabled.
   * 
   * @since Sprint 2 - Module Registry Integration
   */
  moduleAvailability: ModuleAvailability;
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