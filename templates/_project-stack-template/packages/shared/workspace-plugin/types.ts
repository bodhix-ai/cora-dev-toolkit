/**
 * Workspace Plugin Types
 * 
 * These types define the contract between the workspace host (module-ws) and
 * workspace-aware plugins (kb, chat, eval, voice).
 * 
 * This interface avoids direct cross-module imports that cause type-checking failures.
 */

/**
 * Module configuration (resolved from sys → org → ws cascade)
 * 
 * Represents a module's resolved configuration after applying the cascade:
 * 1. System-level defaults (mgmt_cfg_sys_modules)
 * 2. Organization-level overrides (mgmt_cfg_org_modules)
 * 3. Workspace-level overrides (mgmt_cfg_ws_modules)
 * 
 * @since Sprint 3 - Now uses workspace-resolved config (full cascade)
 */
export interface ModuleConfig {
  name: string;
  displayName: string;
  isEnabled: boolean;          // Resolved from sys → org → ws cascade
  isInstalled: boolean;        // Always from system level
  config: Record<string, unknown>;      // Merged from sys → org → ws
  featureFlags: Record<string, boolean>; // Merged from sys → org → ws
}

/**
 * Module availability utilities
 * 
 * Provides methods to check module availability and retrieve module configuration.
 * Module availability uses workspace-resolved config (sys → org → ws cascade).
 * 
 * **Cascade Logic:**
 * - System disabled → Module unavailable (cannot be enabled at org/ws)
 * - Org disabled → Module unavailable in org workspaces (cannot be enabled at ws)
 * - Workspace disabled → Module unavailable in that workspace only
 * 
 * @since Sprint 2 - Module Registry Integration
 * @since Sprint 3 - Enhanced with workspace-resolved config (full cascade)
 */
export interface ModuleAvailability {
  /**
   * Check if a module is available (enabled after sys → org → ws cascade)
   * 
   * Returns true only if:
   * 1. Module is installed at system level
   * 2. Module is enabled at system level
   * 3. Module is not disabled at org level (if org override exists)
   * 4. Module is not disabled at workspace level (if ws override exists)
   * 
   * @param moduleName - The module name (e.g., 'module-kb', 'module-chat')
   * @returns true if module is available after cascade resolution
   */
  isModuleAvailable: (moduleName: string) => boolean;
  
  /**
   * Get module configuration (resolved from sys → org → ws cascade)
   * 
   * Returns the fully resolved module configuration:
   * - isEnabled: Final enablement status after cascade
   * - config: Merged JSONB config (sys base → org overrides → ws overrides)
   * - featureFlags: Merged feature flags (sys base → org overrides → ws overrides)
   * 
   * @param moduleName - The module name (e.g., 'module-kb', 'module-chat')
   * @returns Resolved module configuration or null if module not found
   */
  getModuleConfig: (moduleName: string) => ModuleConfig | null;
  
  /**
   * List of enabled modules (after workspace-level cascade)
   * 
   * Array of module names that are available in this workspace after
   * applying the full sys → org → ws cascade.
   */
  enabledModules: string[];
}

/**
 * Config resolution (sys → org → ws cascade)
 * 
 * Represents the cascading configuration from system → org → workspace.
 * This shows the breakdown of how the final resolved config is computed.
 * 
 * **Resolution Order:**
 * 1. Start with system defaults (mgmt_cfg_sys_modules)
 * 2. Apply org overrides if present (mgmt_cfg_org_modules)
 * 3. Apply workspace overrides if present (mgmt_cfg_ws_modules)
 * 
 * **Enablement Cascade:**
 * - If system disabled → resolved.isEnabled = false (cannot override)
 * - If org disabled → resolved.isEnabled = false (cannot override at ws)
 * - If workspace disabled → resolved.isEnabled = false (only for that ws)
 * 
 * **Config/Flag Merging:**
 * - config: Deep merge (sys base → org overrides → ws overrides)
 * - featureFlags: Merge (sys base → org overrides → ws overrides)
 * 
 * @since Sprint 3 - Full cascade implementation
 */
export interface ModuleConfigResolution {
  systemConfig: ModuleConfig;                  // System-level defaults
  orgOverride?: Partial<ModuleConfig>;         // Org-level overrides (if any)
  workspaceOverride?: Partial<ModuleConfig>;   // Workspace-level overrides (if any)
  resolved: ModuleConfig;                      // Final resolved config after cascade
}

/**
 * Org-level module configuration overrides
 * 
 * Organizations can override system-level module configuration.
 * Stored in mgmt_cfg_org_modules table.
 * 
 * **Cascade Rules:**
 * - Cannot enable if system disabled
 * - Can disable even if system enabled
 * - Applies to all workspaces in the organization
 * - Can be further overridden at workspace level
 * 
 * **Use Cases:**
 * - Org disables expensive modules (voice, eval) to control costs
 * - Org customizes module config for their industry/workflow
 * - Org sets default feature flags for all workspaces
 * 
 * @since Sprint 3 - Implemented
 * @future Will integrate with licensing/paywall system
 */
export interface OrgModuleConfig {
  orgId: string;
  moduleName: string;
  isEnabled: boolean;                           // Org-level enablement (null = inherit from system)
  config?: Record<string, unknown>;             // Org-specific config overrides (merged with system)
  featureFlags?: Record<string, boolean>;       // Org-specific feature flags (merged with system)
}

/**
 * Workspace-level module configuration overrides
 * 
 * Workspaces can override org/system-level module configuration.
 * Stored in mgmt_cfg_ws_modules table.
 * 
 * **Cascade Rules:**
 * - Cannot enable if system disabled
 * - Cannot enable if org disabled
 * - Can disable even if system/org enabled
 * - Only affects this specific workspace
 * 
 * **Use Cases:**
 * - Workspace admin disables modules not needed for their team
 * - Workspace customizes module config for their specific workflow
 * - Workspace enables experimental features via feature flags
 * 
 * **Settings Access:**
 * - Visible only to workspace admins (ws_owner, ws_admin)
 * - Located in workspace settings under "Modules" tab
 * - Only shows modules enabled at both system AND org levels
 * 
 * @since Sprint 3 - Implemented
 */
export interface WorkspaceModuleConfig {
  workspaceId: string;
  moduleName: string;
  config?: Record<string, unknown>;             // Workspace-specific config overrides (merged with org → sys)
  featureFlags?: Record<string, boolean>;       // Workspace-specific feature flags (merged with org → sys)
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
   * Module availability (workspace-resolved config with sys → org → ws cascade)
   * 
   * Provides utilities to check if modules are available and retrieve their configuration.
   * Module availability is determined by the full cascade:
   * 1. System level: is_installed AND is_enabled
   * 2. Org level: not disabled at org level (if override exists)
   * 3. Workspace level: not disabled at workspace level (if override exists)
   * 
   * **Backend Resolution:**
   * - Queries: resolve_all_modules_for_workspace(ws_id)
   * - Returns: Fully resolved module configs with cascade applied
   * 
   * **UI Integration:**
   * - Module tabs only render if isModuleAvailable() returns true
   * - Tab order determined by workspace.tab_order (Sprint 4)
   * - Settings tab shows modules where system AND org enabled
   * 
   * @since Sprint 2 - Module Registry Integration
   * @since Sprint 3 - Enhanced with workspace-resolved config (full cascade)
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