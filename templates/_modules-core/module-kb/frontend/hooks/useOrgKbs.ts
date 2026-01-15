/**
 * useOrgKbs Hook
 * 
 * Manages organization-level knowledge base operations.
 * For use by org admins to create, update, and manage org KBs.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  KnowledgeBase, 
  CreateKbInput,
  UpdateKbInput 
} from '../types';

export interface UseOrgKbsOptions {
  orgId: string | null;
  apiClient: any;
  autoFetch?: boolean;
}

export interface UseOrgKbsReturn {
  kbs: KnowledgeBase[];
  loading: boolean;
  error: string | null;
  createKb: (input: Omit<CreateKbInput, 'scope' | 'orgId'>) => Promise<KnowledgeBase>;
  updateKb: (kbId: string, input: UpdateKbInput) => Promise<KnowledgeBase>;
  deleteKb: (kbId: string) => Promise<void>;
  getKb: (kbId: string) => Promise<KnowledgeBase>;
  refresh: () => Promise<void>;
}

export function useOrgKbs({
  orgId,
  apiClient,
  autoFetch = true,
}: UseOrgKbsOptions): UseOrgKbsReturn {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKbs = useCallback(async () => {
    if (!orgId || !apiClient) {
      setKbs([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const kbClient = apiClient.kb;
      const data = await kbClient.orgAdmin.listKbs(orgId);
      setKbs(data);
    } catch (err: any) {
      console.error('Failed to fetch org KBs:', err);
      setError(err.message || 'Failed to fetch knowledge bases');
      setKbs([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, apiClient]);

  const refresh = useCallback(async () => {
    await fetchKbs();
  }, [fetchKbs]);

  const createKb = useCallback(
    async (input: Omit<CreateKbInput, 'scope' | 'orgId'>): Promise<KnowledgeBase> => {
      if (!orgId || !apiClient) {
        throw new Error('Cannot create KB: missing org ID or API client');
      }

      try {
        setError(null);

        const fullInput: CreateKbInput = {
          ...input,
          scope: 'org',
          orgId,
        };

        const kbClient = apiClient.kb;
        const newKb = await kbClient.orgAdmin.createKb(orgId, fullInput);

        // Refresh list to include new KB
        await fetchKbs();

        return newKb;
      } catch (err: any) {
        console.error('Failed to create org KB:', err);
        setError(err.message || 'Failed to create knowledge base');
        throw err;
      }
    },
    [orgId, apiClient, fetchKbs]
  );

  const updateKb = useCallback(
    async (kbId: string, input: UpdateKbInput): Promise<KnowledgeBase> => {
      if (!orgId || !apiClient) {
        throw new Error('Cannot update KB: missing org ID or API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        const updatedKb = await kbClient.orgAdmin.updateKb(orgId, kbId, input);

        // Update local state
        setKbs((prev) =>
          prev.map((kb) => (kb.id === kbId ? updatedKb : kb))
        );

        return updatedKb;
      } catch (err: any) {
        console.error(`Failed to update KB ${kbId}:`, err);
        setError(err.message || 'Failed to update knowledge base');
        throw err;
      }
    },
    [orgId, apiClient]
  );

  const deleteKb = useCallback(
    async (kbId: string): Promise<void> => {
      if (!orgId || !apiClient) {
        throw new Error('Cannot delete KB: missing org ID or API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        await kbClient.orgAdmin.deleteKb(orgId, kbId);

        // Remove from local state
        setKbs((prev) => prev.filter((kb) => kb.id !== kbId));
      } catch (err: any) {
        console.error(`Failed to delete KB ${kbId}:`, err);
        setError(err.message || 'Failed to delete knowledge base');
        throw err;
      }
    },
    [orgId, apiClient]
  );

  const getKb = useCallback(
    async (kbId: string): Promise<KnowledgeBase> => {
      if (!orgId || !apiClient) {
        throw new Error('Cannot get KB: missing org ID or API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        const kb = await kbClient.orgAdmin.getKb(orgId, kbId);

        return kb;
      } catch (err: any) {
        console.error(`Failed to get KB ${kbId}:`, err);
        setError(err.message || 'Failed to get knowledge base');
        throw err;
      }
    },
    [orgId, apiClient]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchKbs();
    }
  }, [autoFetch, fetchKbs]);

  return {
    kbs,
    loading,
    error,
    createKb,
    updateKb,
    deleteKb,
    getKb,
    refresh,
  };
}
