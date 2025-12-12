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
export { useLambdaWarming, useLambdaFunctions } from "./hooks";

// Export components (to be added after component migration)
// export * from "./components";

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
