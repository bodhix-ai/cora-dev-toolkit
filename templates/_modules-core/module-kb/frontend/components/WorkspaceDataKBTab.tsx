/**
 * WorkspaceDataKBTab Component
 * 
 * Integrates KB management into workspace pages.
 * Shows KB toggle selector and document upload for workspace-scoped KBs.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  Alert,
} from '@mui/material';
import {
  LibraryBooks as KBIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { KBToggleSelector } from './KBToggleSelector';
import { DocumentUploadZone } from './DocumentUploadZone';
import { DocumentTable } from './DocumentTable';
import { KBStatsCard } from './KBStatsCard';
import type { 
  KnowledgeBase, 
  KbDocument, 
  AvailableKb,
} from '../types';

/**
 * Grouped available KBs structure for KBToggleSelector
 */
interface GroupedAvailableKbs {
  workspaceKb?: AvailableKb;
  chatKb?: AvailableKb;
  orgKbs: AvailableKb[];
  globalKbs: AvailableKb[];
}

interface WorkspaceDataKBTabProps {
  /**
   * Workspace ID
   */
  workspaceId: string;
  
  /**
   * Workspace KB (if exists)
   */
  kb?: KnowledgeBase | null;
  
  /**
   * Available KBs grouped by scope
   */
  availableKbs?: GroupedAvailableKbs;
  
  /**
   * Documents in workspace KB
   */
  documents?: KbDocument[];
  
  /**
   * Loading state for KB data
   */
  kbLoading?: boolean;
  
  /**
   * Loading state for documents
   */
  documentsLoading?: boolean;
  
  /**
   * Loading state for available KBs
   */
  availableKbsLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * Whether user can upload documents (based on KB config)
   */
  canUpload?: boolean;
  
  /**
   * Callback to toggle KB enablement
   */
  onToggleKb?: (kbId: string, enabled: boolean) => Promise<void>;
  
  /**
   * Callback to upload documents
   */
  onUploadDocument?: (files: File[]) => Promise<void>;
  
  /**
   * Callback to delete document
   */
  onDeleteDocument?: (docId: string) => Promise<void>;
  
  /**
   * Callback to download document
   */
  onDownloadDocument?: (docId: string) => Promise<void>;
  
  /**
   * Callback to retry failed document
   */
  onRetryDocument?: (docId: string) => Promise<void>;
  
  /**
   * Current user ID for ownership checks
   */
  currentUserId?: string;
}

/**
 * WorkspaceDataKBTab integrates KB management into workspace pages.
 * 
 * This component displays:
 * 1. KB toggle selector - shows available KBs (org, sys) that can be enabled
 * 2. Document upload zone - allows uploading files to workspace KB
 * 3. Document table - lists documents with status and actions
 * 4. KB stats - document count, chunk count, storage size
 */
export function WorkspaceDataKBTab({
  workspaceId,
  kb = null,
  availableKbs,
  documents = [],
  kbLoading = false,
  documentsLoading = false,
  availableKbsLoading = false,
  error = null,
  canUpload = true,
  onToggleKb,
  onUploadDocument,
  onDeleteDocument,
  onDownloadDocument,
  onRetryDocument,
  currentUserId,
}: WorkspaceDataKBTabProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Default grouped KBs structure
  const groupedKbs: GroupedAvailableKbs = availableKbs || {
    workspaceKb: undefined,
    chatKb: undefined,
    orgKbs: [],
    globalKbs: [],
  };

  /**
   * Handle document upload (supports multiple files)
   */
  const handleUpload = async (files: File[]) => {
    if (!onUploadDocument) return;
    setUploadError(null);
    try {
      await onUploadDocument(files);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  // Show error if any
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {/* KB Toggle Selector */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <KBIcon color="primary" />
          <Typography variant="h6">Knowledge Base Sources</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Enable knowledge bases to make their content available for AI chat responses in this workspace.
        </Typography>
        <KBToggleSelector
          availableKbs={groupedKbs}
          loading={availableKbsLoading}
          onToggle={onToggleKb || (async () => {})}
        />
      </Paper>

      <Divider />

      {/* Document Upload Section */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <DocumentIcon color="primary" />
          <Typography variant="h6">Workspace Documents</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Upload documents to create a workspace-specific knowledge base.
          Uploaded documents will be processed and indexed for AI chat.
        </Typography>

        {/* Stats Card (if KB exists) */}
        {kb && (
          <Box mb={3}>
            <KBStatsCard
              stats={{
                documentCount: kb.documentCount || 0,
                chunkCount: kb.chunkCount || 0,
                totalSize: kb.totalSize || 0,
                processingCount: documents.filter(d => d.status === 'processing').length,
                failedCount: documents.filter(d => d.status === 'failed').length,
              }}
              compact={true}
            />
          </Box>
        )}

        {/* Upload Zone */}
        {canUpload && onUploadDocument && (
          <Box mb={3}>
            <DocumentUploadZone
              onUpload={handleUpload}
              disabled={documentsLoading}
            />
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Box>
        )}

        {/* Documents Table */}
        <DocumentTable
          documents={documents}
          loading={documentsLoading}
          onDelete={onDeleteDocument || (async () => {})}
          onDownload={onDownloadDocument || (async () => {})}
          onRetry={onRetryDocument}
          currentUserId={currentUserId}
        />

        {/* No KB message */}
        {!kb && documents.length === 0 && !documentsLoading && (
          <Alert severity="info" icon={<KBIcon />}>
            No workspace knowledge base yet. Upload documents to create one.
          </Alert>
        )}
      </Paper>
    </Stack>
  );
}
