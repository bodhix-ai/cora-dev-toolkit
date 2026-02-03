/**
 * Lambda Management Module - Main Entry Point
 *
 * This is the main entry point for the Lambda Management Module frontend package.
 * Import components, hooks, types, and utilities from this file.
 *
 * @packageDocumentation
 */

// Export all types
export * from "./types";

// Export API client
export { LambdaMgmtApiClient, createLambdaMgmtClient } from "./lib/api";

// Export all hooks
export {
  useLambdaWarming,
  useLambdaFunctions,
  useModuleRegistry,
  useModule,
  useEnabledModules,
  useModuleEnabled,
  useModuleNavigation,
  useOrgModuleConfig,
  useWorkspaceModuleConfig,
} from "./hooks";

// Export admin card
export { platformMgmtAdminCard } from "./adminCard";

// Export admin components
export { PlatformMgmtAdmin } from "./components/admin/PlatformMgmtAdmin";
export { ScheduleTab } from "./components/admin/ScheduleTab";
export { PerformanceTab } from "./components/admin/PerformanceTab";
export { StorageTab } from "./components/admin/StorageTab";
export { CostTab } from "./components/admin/CostTab";

// Export other components
export { ModuleAdminDashboard } from "./components/ModuleAdminDashboard";
export { ModuleGate, ModuleAwareNavigation, ModuleConditional } from "./components/ModuleAwareNavigation";

/**
 * Module metadata
 */
export const MODULE_INFO = {
  name: "@cora/lambda-mgmt-module",
  version: "1.0.0",
  description: "Lambda Management Module for CORA projects",
  provides: {
    endpoints: [
      "/platform/lambda-config",
      "/platform/lambda-config/{configKey}",
      "/platform/lambda-functions",
      "/platform/lambda-config/sync",
    ],
    hooks: ["useLambdaWarming", "useLambdaFunctions"],
    components: [
      // "LambdaWarmingCard", // To be added
      // "LambdaConfigList",  // To be added
      // "ScheduleEditor",    // To be added
    ],
  },
} as const;
