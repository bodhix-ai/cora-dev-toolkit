/**
 * Workspace Module - Frontend Index
 *
 * Main entry point for the workspace module frontend.
 * Exports all types, hooks, API client, and admin cards.
 */

// Types
export * from "./types";

// API Client
export { WorkspaceApiClient, createWorkspaceApiClient } from "./lib/api";

// Hooks
export * from "./hooks";

// Admin Cards
export { workspacePlatformAdminCard, workspaceOrgAdminCard } from "./adminCard";

// Admin Components
export * from "./components/admin";

// Pages (for app route integration)
export * from "./pages";

// Re-export commonly used types for convenience
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceConfig,
  WorkspaceRole,
  WorkspaceStatus,
  WorkspaceFormValues,
  WorkspaceFilters,
} from "./types";
