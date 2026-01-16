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

export interface UseKbDocumentsOptions {
  scope: 'workspace' | 'chat' | 'kb';
  scopeId: string | null; // workspaceId, chatId, or kbId
  apiClient: any;
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

  const fetchDocuments = useCallback(async () => {
    if (!scopeId || !apiClient) {
      setDocuments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const kbClient = apiClient.kb;
      let data: KbDocument[];

      if (scope === 'workspace') {
        data = await kbClient.workspace.listDocuments(scopeId);
      } else if (scope === 'chat') {
        data = await kbClient.chat.listDocuments(scopeId);
      } else {
        // Direct KB ID access (for admin views)
        data = await kbClient.orgAdmin.listDocuments(scopeId);
      }

      setDocuments(data);
    } catch (err: any) {
      console.error(`Failed to fetch documents for ${scope}:`, err);
      setError(err.message || 'Failed to fetch documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, apiClient]);

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
        let uploadResponse: UploadDocumentResponse;

        if (scope === 'workspace') {
          uploadResponse = await kbClient.workspace.uploadDocument(scopeId, input);
        } else if (scope === 'chat') {
          uploadResponse = await kbClient.chat.uploadDocument(scopeId, input);
        } else {
          // Admin upload to specific KB
          uploadResponse = await kbClient.orgAdmin.uploadDocument(scopeId, input);
        }

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
      } catch (err: any) {
        console.error('Failed to upload document:', err);
        setError(err.message || 'Failed to upload document');
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
      } catch (err: any) {
        console.error(`Failed to delete document ${documentId}:`, err);
        setError(err.message || 'Failed to delete document');
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
        let downloadResponse: DownloadDocumentResponse;

        if (scope === 'workspace') {
          downloadResponse = await kbClient.workspace.downloadDocument(scopeId, documentId);
        } else if (scope === 'chat') {
          // Chat scope may not have download endpoint - fallback to workspace
          throw new Error('Download not supported for chat scope');
        } else {
          downloadResponse = await kbClient.orgAdmin.downloadDocument(scopeId, documentId);
        }

        return downloadResponse.downloadUrl;
      } catch (err: any) {
        console.error(`Failed to get download URL for document ${documentId}:`, err);
        setError(err.message || 'Failed to get download URL');
        throw err;
      }
    },
    [scope, scopeId, apiClient]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchDocuments();
    }
  }, [autoFetch, fetchDocuments]);

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
