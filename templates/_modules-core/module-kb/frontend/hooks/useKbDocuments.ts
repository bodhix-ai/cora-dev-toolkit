/**
 * useKbDocuments Hook
 * 
 * Manages document operations for a knowledge base.
 * Handles document listing, upload, download, and deletion.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  KbDocument, 
  UploadDocumentInput,
  UploadDocumentResponse,
  DownloadDocumentResponse 
} from '../types';
import type { KbModuleApiClient } from '../lib/api';

/**
 * API client interface with KB module
 */
export interface ApiClientWithKb {
  kb: KbModuleApiClient;
}

export interface UseKbDocumentsOptions {
  scope: 'workspace' | 'chat' | 'kb';
  scopeId: string | null; // workspaceId, chatId, or kbId
  apiClient: ApiClientWithKb;
  autoFetch?: boolean;
}

export interface UseKbDocumentsReturn {
  documents: KbDocument[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  uploadDocument: (file: File) => Promise<KbDocument>;
  deleteDocument: (documentId: string) => Promise<void>;
  downloadDocument: (documentId: string) => Promise<string>;
  refresh: () => Promise<void>;
}

const MAX_FETCH_RETRIES = 3;

export function useKbDocuments({
  scope,
  scopeId,
  apiClient,
  autoFetch = true,
}: UseKbDocumentsOptions): UseKbDocumentsReturn {
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDocuments = useCallback(async () => {
    if (!scopeId || !apiClient) {
      setDocuments([]);
      setRetryCount(0);
      return;
    }

    // Stop fetching if max retries reached
    if (retryCount >= MAX_FETCH_RETRIES) {
      console.warn(`Max fetch retries (${MAX_FETCH_RETRIES}) reached for ${scope}. Stopping further attempts.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const kbClient = apiClient.kb;
      let response;

      if (scope === 'workspace') {
        response = await kbClient.workspace.listDocuments(scopeId);
      } else if (scope === 'chat') {
        response = await kbClient.chat.listDocuments(scopeId);
      } else {
        // Direct KB ID access (for admin views)
        response = await kbClient.orgAdmin.listDocuments(scopeId);
      }

      // Extract documents array from response data (response.data IS KbDocument[], not { documents: KbDocument[] })
      setDocuments(response.data || []);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      console.error(`Failed to fetch documents for ${scope} (attempt ${retryCount + 1}/${MAX_FETCH_RETRIES}):`, err);
      setError(errorMessage);
      setDocuments([]);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, apiClient, retryCount]);

  const refresh = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = useCallback(
    async (file: File): Promise<KbDocument> => {
      if (!scopeId || !apiClient) {
        throw new Error('Cannot upload document: missing scope ID or API client');
      }

      try {
        setUploading(true);
        setError(null);

        // Step 1: Request presigned upload URL
        const input: UploadDocumentInput = {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };

        const kbClient = apiClient.kb;
        let response;

        if (scope === 'workspace') {
          response = await kbClient.workspace.uploadDocument(scopeId, input);
        } else if (scope === 'chat') {
          response = await kbClient.chat.uploadDocument(scopeId, input);
        } else {
          // Admin upload to specific KB
          response = await kbClient.orgAdmin.uploadDocument(scopeId, input);
        }
        
        const uploadResponse = response.data;

        // Step 2: Upload file directly to S3 using presigned URL
        const uploadResult = await fetch(uploadResponse.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error(`Failed to upload file to S3: ${uploadResult.statusText}`);
        }

        // Step 3: Refresh document list to show new document
        await fetchDocuments();

        return uploadResponse.document;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
        console.error('Failed to upload document:', err);
        setError(errorMessage);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [scope, scopeId, apiClient, fetchDocuments]
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      if (!scopeId || !apiClient) {
        throw new Error('Cannot delete document: missing scope ID or API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;

        if (scope === 'workspace') {
          await kbClient.workspace.deleteDocument(scopeId, documentId);
        } else if (scope === 'chat') {
          await kbClient.chat.deleteDocument(scopeId, documentId);
        } else {
          await kbClient.orgAdmin.deleteDocument(scopeId, documentId);
        }

        // Refresh document list
        await fetchDocuments();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
        console.error(`Failed to delete document ${documentId}:`, err);
        setError(errorMessage);
        throw err;
      }
    },
    [scope, scopeId, apiClient, fetchDocuments]
  );

  const downloadDocument = useCallback(
    async (documentId: string): Promise<string> => {
      if (!scopeId || !apiClient) {
        throw new Error('Cannot download document: missing scope ID or API client');
      }

      try {
        setError(null);

        const kbClient = apiClient.kb;

        if (scope === 'workspace') {
          const response = await kbClient.workspace.downloadDocument(scopeId, documentId);
          return response.data.downloadUrl;
        } else {
          // Chat and KB scopes don't have download endpoint
          throw new Error(`Download not supported for ${scope} scope`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get download URL';
        console.error(`Failed to get download URL for document ${documentId}:`, err);
        setError(errorMessage);
        throw err;
      }
    },
    [scope, scopeId, apiClient]
  );

  useEffect(() => {
    if (autoFetch && retryCount < MAX_FETCH_RETRIES) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, scopeId]);

  return {
    documents,
    loading,
    uploading,
    error,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    refresh,
  };
}
