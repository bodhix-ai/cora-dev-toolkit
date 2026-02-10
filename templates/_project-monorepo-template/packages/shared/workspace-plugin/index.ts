/**
 * Workspace Plugin Package
 * 
 * Provides the contract between workspace host (module-ws) and workspace-aware plugins.
 * 
 * @packageDocumentation
 */

export type {
  WorkspacePluginContext,
  WorkspacePluginContextValue,
  ModuleConfig,
} from './types';

export { WorkspacePluginContext as WorkspacePluginContextInstance } from './context';
export { useWorkspacePlugin } from './useWorkspacePlugin';
