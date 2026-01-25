/**
 * Workspace Plugin Context
 * 
 * React Context for providing workspace context to plugin modules.
 */

'use client';

import { createContext } from 'react';
import type { WorkspacePluginContextValue } from './types';

/**
 * Default context value
 */
const defaultContextValue: WorkspacePluginContextValue = {
  workspaceId: '',
  navigation: {
    labelSingular: 'Workspace',
    labelPlural: 'Workspaces',
    icon: 'folder',
  },
  features: {
    favoritesEnabled: false,
    tagsEnabled: false,
    colorCodingEnabled: false,
  },
  refresh: async () => {},
  loading: false,
  error: null,
};

/**
 * Workspace Plugin Context
 * 
 * This context is provided by the workspace host (module-ws via apps/web)
 * and consumed by workspace-aware plugins.
 */
export const WorkspacePluginContext = createContext<WorkspacePluginContextValue>(
  defaultContextValue
);

WorkspacePluginContext.displayName = 'WorkspacePluginContext';