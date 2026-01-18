/**
 * useWorkspaceKB Hook
 *
 * Combines KB and document management for workspace context.
 * Provides all state and callbacks needed by WorkspaceDataKBTab.
 */

import { useState, useEffect, useCallback } from 'react';
import type { KnowledgeBase, KbDocument, AvailableKb } from '../types';
import type { KbModuleApiClient } from '../lib/api';

interface GroupedAvailableKbs {
  workspaceKb?: AvailableKb;
  chatKb?: AvailableKb;
  orgKbs: AvailableKb[];
  globalKbs: AvailableKb[];
}

/**
 * API client interface with KB module
 */
export interface ApiClientWithKb {
  kb: KbModuleApiClient;
}

export interface UseWorkspaceKBOptions {
  /** Workspace ID */
  workspaceId: string;
  /** API client with KB module */
  apiClient: ApiClientWithKb | null;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseWorkspaceKBReturn {
  /** Workspace KB (if exists) */
  kb: KnowledgeBase | null;
  /** Documents in workspace KB */
  documents: KbDocument[];
  /** Available KBs grouped by scope */
  availableKbs: GroupedAvailableKbs;
  /** Loading state for KB */
  kbLoading: boolean;
  /** Loading state for documents */
  documentsLoading: boolean;
  /** Loading state for available KBs */
  availableKbsLoading: boolean;
  /** Error message */
  error: string | null;
  /** Upload documents to workspace KB */
  uploadDocument: (files: File[]) => Promise<void>;
  /** Delete document from KB */
  deleteDocument: (docId: string) => Promise<void>;
  /** Download document */
  downloadDocument: (docId: string) => Promise<string | void>;
  /** Retry failed document processing */
  retryDocument: (docId: string) => Promise<void>;
  /** Toggle KB enablement for workspace */
  toggleKb: (kbId: string, enabled: boolean) => Promise<void>;
  /** Refresh all data */
  refetch: () => Promise<void>;
}

/**
 * Hook for managing workspace KB data and operations
 */
export function useWorkspaceKB({
  workspaceId,
  apiClient,
  autoFetch = true,
}: UseWorkspaceKBOptions): UseWorkspaceKBReturn {
  // State
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [availableKbs, setAvailableKbs] = useState<GroupedAvailableKbs>({
    orgKbs: [],
    globalKbs: [],
  });
  const [kbLoading, setKbLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [availableKbsLoading, setAvailableKbsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace KB
  const fetchWorkspaceKb = useCallback(async () => {
    if (!apiClient || !workspaceId) return;

    setKbLoading(true);
    setError(null);

    try {
      const response = await apiClient.kb.workspace.getKb(workspaceId);
      setKb(response.data || null);
    } catch (err) {
      console.error('Failed to fetch workspace KB:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch KB');
      setKb(null);
    } finally {
      setKbLoading(false);
    }
  }, [apiClient, workspaceId]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!apiClient || !workspaceId) {
      setDocuments([]);
      return;
    }

    setDocumentsLoading(true);

    try {
      const response = await apiClient.kb.workspace.listDocuments(workspaceId);
      setDocuments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [apiClient, workspaceId]);

  // Fetch available KBs for workspace
  const fetchAvailableKbs = useCallback(async () => {
    if (!apiClient || !workspaceId) return;

    setAvailableKbsLoading(true);

    try {
      const response = await apiClient.kb.workspace.listAvailableKbs(workspaceId);
      const kbs = response.data || [];

      // Group by scope
      const grouped: GroupedAvailableKbs = {
        orgKbs: [],
        globalKbs: [],
      };

      for (const kbItem of kbs) {
        if (kbItem.scope === 'workspace') {
          grouped.workspaceKb = kbItem;
        } else if (kbItem.scope === 'chat') {
          grouped.chatKb = kbItem;
        } else if (kbItem.scope === 'org') {
          grouped.orgKbs.push(kbItem);
        } else if (kbItem.scope === 'global' || kbItem.scope === 'sys') {
          grouped.globalKbs.push(kbItem);
        }
      }

      setAvailableKbs(grouped);
    } catch (err) {
      console.error('Failed to fetch available KBs:', err);
    } finally {
      setAvailableKbsLoading(false);
    }
  }, [apiClient, workspaceId]);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchWorkspaceKb(),
      fetchAvailableKbs(),
    ]);
  }, [fetchWorkspaceKb, fetchAvailableKbs]);

  // Upload document
  const uploadDocument = useCallback(async (files: File[]) => {
    if (!apiClient || !workspaceId) {
      throw new Error('Cannot upload: KB not initialized');
    }

    for (const file of files) {
      // Get presigned URL
      const uploadResponse = await apiClient.kb.workspace.uploadDocument(workspaceId, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      const { uploadUrl } = uploadResponse.data;

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
    }

    // Refresh documents
    await fetchDocuments();
  }, [apiClient, workspaceId, fetchDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (docId: string) => {
    if (!apiClient || !workspaceId) return;

    await apiClient.kb.workspace.deleteDocument(workspaceId, docId);
    await fetchDocuments();
  }, [apiClient, workspaceId, fetchDocuments]);

  // Download document
  const downloadDocument = useCallback(async (docId: string): Promise<string | void> => {
    if (!apiClient || !workspaceId) return;

    const response = await apiClient.kb.workspace.downloadDocument(workspaceId, docId);
    return response.data?.downloadUrl;
  }, [apiClient, workspaceId]);

  // Retry failed document - not implemented yet in API
  const retryDocument = useCallback(async (docId: string) => {
    console.warn('Retry document not yet implemented:', docId);
    // TODO: Implement retry when API supports it
  }, []);

  // Toggle KB enablement
  const toggleKb = useCallback(async (kbId: string, enabled: boolean) => {
    if (!apiClient || !workspaceId) return;

    await apiClient.kb.workspace.toggleKb(workspaceId, kbId, { enabled });
    await fetchAvailableKbs();
  }, [apiClient, workspaceId, fetchAvailableKbs]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && apiClient && workspaceId) {
      refetch();
    }
  }, [autoFetch, apiClient, workspaceId, refetch]);

  // Fetch documents when KB changes
  useEffect(() => {
    if (kb?.id && apiClient) {
      fetchDocuments();
    }
  }, [kb?.id, apiClient, fetchDocuments]);

  return {
    kb,
    documents,
    availableKbs,
    kbLoading,
    documentsLoading,
    availableKbsLoading,
    error,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    retryDocument,
    toggleKb,
    refetch,
  };
}
