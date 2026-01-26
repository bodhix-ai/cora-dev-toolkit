/**
 * Platform Management Module - Hooks Barrel Export
 *
 * Exports all React hooks for platform management functionality.
 */

// Lambda Management
export { useLambdaWarming } from "./useLambdaWarming";
export { useLambdaFunctions } from "./useLambdaFunctions";

export type { default as UseLambdaWarmingReturn } from "./useLambdaWarming";
export type { default as UseLambdaFunctionsReturn } from "./useLambdaFunctions";

// Module Registry
export {
  useModuleRegistry,
  useModule,
  useEnabledModules,
  useModuleEnabled,
  useModuleNavigation,
} from "./useModuleRegistry";

export type {
  Module,
  ModuleNavConfig,
  ModuleRegistryState,
  ModuleRegistryActions,
  ModuleUpdate,
  ModuleRegistration,
  UseModuleRegistryOptions,
  UseModuleRegistryReturn,
} from "./useModuleRegistry";
