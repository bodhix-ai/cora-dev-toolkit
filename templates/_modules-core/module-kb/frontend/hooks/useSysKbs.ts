/**
 * useSysKbs Hook
 * 
 * Manages system-level (global) knowledge base operations.
 * For use by platform admins to create, update, and manage system KBs.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  KnowledgeBase, 
  CreateKbInput,
  UpdateKbInput,
  AssociateOrgInput 
} from '../types';

export interface UseSysKbsOptions {
  apiClient: any;
  autoFetch?: boolean;
}

export interface UseSysKbsReturn {
  kbs: KnowledgeBase[];
  loading: boolean;
  error: string | null;
  createKb: (input: Omit<CreateKbInput, 'scope'>) => Promise<KnowledgeBase>;
  updateKb: (kbId: string, input: UpdateKbInput) => Promise<KnowledgeBase>;
  deleteKb: (kbId: string) => Promise<void>;
  getKb: (kbId: string) => Promise<KnowledgeBase>;
  associateOrg: (kbId: string, orgId: string) => Promise<void>;
  removeOrg: (kbId: string, orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSysKbs({
  apiClient,
  autoFetch = true,
}: UseSysKbsOptions): UseSysKbsReturn {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKbs = useCallback(async () => {
    if (!apiClient) {
      setKbs([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const kbClient = apiClient.kb;
      const data = await kbClient.sysAdmin.listKbs();
      setKbs(data);
    } catch (err: any) {
      console.error('Failed to fetch system KBs:', err);
      setError(err.message || 'Failed to fetch knowledge bases');
      setKbs([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const refresh = useCallback(async () => {
    await fetchKbs();
  }, [fetchKbs]);

  const createKb = useCallback(
    async (input: Omit<CreateKbInput, 'scope'>): Promise<KnowledgeBase> => {
      if (!apiClient) {
        throw new Error('Cannot create KB: missing API client');
      }

      try {
        setError(null);

        const fullInput: CreateKbInput = {
          ...input,
          scope: 'sys',
        };

        const kbClient = apiClient.kb;
        const newKb = await kbClient.sysAdmin.createKb(fullInput);

        // Refresh list to include new KB
        await fetchKbs();

        return newKb;
      } catch (err: any) {
        console.error('Failed to create system KB:', err);
        setError(err.message || 'Failed to create knowledge base');
        throw err;
      }
    },
    [apiClient, fetchKbs]
  );

  const updateKb = useCallback(
    async (kbId: string, input: UpdateKbInput): Promise<KnowledgeBase> => {
      if (!apiClient) {
        throw new Error('Cannot update KB: missing API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        const updatedKb = await kbClient.sysAdmin.updateKb(kbId, input);

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
    [apiClient]
  );

  const deleteKb = useCallback(
    async (kbId: string): Promise<void> => {
      if (!apiClient) {
        throw new Error('Cannot delete KB: missing API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        await kbClient.sysAdmin.deleteKb(kbId);

        // Remove from local state
        setKbs((prev) => prev.filter((kb) => kb.id !== kbId));
      } catch (err: any) {
        console.error(`Failed to delete KB ${kbId}:`, err);
        setError(err.message || 'Failed to delete knowledge base');
        throw err;
      }
    },
    [apiClient]
  );

  const getKb = useCallback(
    async (kbId: string): Promise<KnowledgeBase> => {
      if (!apiClient) {
        throw new Error('Cannot get KB: missing API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        const kb = await kbClient.sysAdmin.getKb(kbId);

        return kb;
      } catch (err: any) {
        console.error(`Failed to get KB ${kbId}:`, err);
        setError(err.message || 'Failed to get knowledge base');
        throw err;
      }
    },
    [apiClient]
  );

  const associateOrg = useCallback(
    async (kbId: string, orgId: string): Promise<void> => {
      if (!apiClient) {
        throw new Error('Cannot associate org: missing API client');
      }

      try {
        setError(null);

        const input: AssociateOrgInput = { orgId };
        const kbClient = apiClient.kb;
        await kbClient.sysAdmin.associateOrg(kbId, input);

        // Refresh to get updated org associations
        await fetchKbs();
      } catch (err: any) {
        console.error(`Failed to associate org ${orgId} with KB ${kbId}:`, err);
        setError(err.message || 'Failed to associate organization');
        throw err;
      }
    },
    [apiClient, fetchKbs]
  );

  const removeOrg = useCallback(
    async (kbId: string, orgId: string): Promise<void> => {
      if (!apiClient) {
        throw new Error('Cannot remove org: missing API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;
        await kbClient.sysAdmin.removeOrg(kbId, orgId);

        // Refresh to get updated org associations
        await fetchKbs();
      } catch (err: any) {
        console.error(`Failed to remove org ${orgId} from KB ${kbId}:`, err);
        setError(err.message || 'Failed to remove organization');
        throw err;
      }
    },
    [apiClient, fetchKbs]
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
    associateOrg,
    removeOrg,
    refresh,
  };
}
