/**
 * useKnowledgeBase Hook
 * 
 * Generic hook for KB operations at workspace or chat scope.
 * Handles KB retrieval, available KBs listing, and KB toggling.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  KnowledgeBase, 
  AvailableKb,
  ToggleKbInput 
} from '../types';

export interface UseKnowledgeBaseOptions {
  scope: 'workspace' | 'chat';
  scopeId: string | null;
  apiClient: any; // Authenticated API client
  autoFetch?: boolean;
}

export interface UseKnowledgeBaseReturn {
  kb: KnowledgeBase | null;
  availableKbs: AvailableKb[];
  loading: boolean;
  error: string | null;
  toggleKb: (kbId: string, enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useKnowledgeBase({
  scope,
  scopeId,
  apiClient,
  autoFetch = true,
}: UseKnowledgeBaseOptions): UseKnowledgeBaseReturn {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [availableKbs, setAvailableKbs] = useState<AvailableKb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKb = useCallback(async () => {
    if (!scopeId || !apiClient) {
      setKb(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const kbClient = apiClient.kb;
      
      if (scope === 'workspace') {
        const data = await kbClient.workspace.getKb(scopeId);
        setKb(data);
      } else {
        const data = await kbClient.chat.getKb(scopeId);
        setKb(data);
      }
    } catch (err: any) {
      console.error(`Failed to fetch ${scope} KB:`, err);
      setError(err.message || 'Failed to fetch knowledge base');
      setKb(null);
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, apiClient]);

  const fetchAvailableKbs = useCallback(async () => {
    if (!scopeId || !apiClient) {
      setAvailableKbs([]);
      return;
    }

    try {
      const kbClient = apiClient.kb;
      
      if (scope === 'workspace') {
        const data = await kbClient.workspace.listAvailableKbs(scopeId);
        setAvailableKbs(data);
      } else {
        const data = await kbClient.chat.listAvailableKbs(scopeId);
        setAvailableKbs(data);
      }
    } catch (err: any) {
      console.error(`Failed to fetch available KBs for ${scope}:`, err);
      setError(err.message || 'Failed to fetch available knowledge bases');
      setAvailableKbs([]);
    }
  }, [scope, scopeId, apiClient]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchKb(), fetchAvailableKbs()]);
  }, [fetchKb, fetchAvailableKbs]);

  const toggleKb = useCallback(
    async (kbId: string, enabled: boolean) => {
      if (!scopeId || !apiClient) {
        throw new Error('Cannot toggle KB: missing scope ID or API client');
      }

      try {
        setError(null);

        const input: ToggleKbInput = { 
          knowledgeBaseId: kbId,
          isEnabled: enabled 
        };
        const kbClient = apiClient.kb;

        if (scope === 'workspace') {
          await kbClient.workspace.toggleKb(scopeId, kbId, input);
        } else {
          await kbClient.chat.toggleKb(scopeId, kbId, input);
        }

        // Refresh available KBs to reflect new state
        await fetchAvailableKbs();
      } catch (err: any) {
        console.error(`Failed to toggle KB ${kbId}:`, err);
        setError(err.message || 'Failed to toggle knowledge base');
        throw err;
      }
    },
    [scope, scopeId, apiClient, fetchAvailableKbs]
  );

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  return {
    kb,
    availableKbs,
    loading,
    error,
    toggleKb,
    refresh,
  };
}
