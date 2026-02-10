/**
 * Workspace Plugin Hook
 * 
 * Hook for consuming workspace context in plugin modules.
 */

'use client';

import { useContext } from 'react';
import { WorkspacePluginContext } from './context';
import type { WorkspacePluginContextValue } from './types';

/**
 * Use Workspace Plugin Context
 * 
 * Hook for consuming the workspace plugin context in workspace-aware modules.
 * 
 * @throws {Error} If used outside of a WorkspacePluginProvider
 * 
 * @example
 * ```tsx
 * function MyPluginComponent() {
 *   const { workspaceId, navigation, features } = useWorkspacePlugin();
 *   
 *   return (
 *     <div>
 *       <h1>{navigation.labelSingular}</h1>
 *       <p>Workspace: {workspaceId}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkspacePlugin(): WorkspacePluginContextValue {
  const context = useContext(WorkspacePluginContext);
  
  if (!context.workspaceId && process.env.NODE_ENV !== 'production') {
    console.warn(
      'useWorkspacePlugin: No workspace context found. ' +
      'Make sure this component is wrapped in a WorkspacePluginProvider.'
    );
  }
  
  return context;
}