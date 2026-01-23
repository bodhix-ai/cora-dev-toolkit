/**
 * OrgAdminKBPage Component
 * 
 * Full-page view for organization KB management.
 * Provides CRUD operations for org-level knowledge bases.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  LibraryBooks as KBIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { OrgKBList } from '../components/admin/OrgKBList';
import { DocumentTable } from '../components/DocumentTable';
import { DocumentUploadZone } from '../components/DocumentUploadZone';
import type { 
  KnowledgeBase, 
  CreateKbInput, 
  UpdateKbInput,
  KbDocument,
} from '../types';

interface OrgAdminKBPageProps {
  /**
   * Organization ID
   */
  orgId: string;
  
  /**
   * Organization name for display
   */
  orgName?: string;
  
  /**
   * List of organization KBs
   */
  kbs: KnowledgeBase[];
  
  /**
   * Loading state for KBs
   */
  kbsLoading?: boolean;
  
  /**
   * Error message for KBs
   */
  kbsError?: string | null;
  
  /**
   * Callback to create new KB
   */
  onCreateKb: (data: CreateKbInput) => Promise<void>;
  
  /**
   * Callback to update KB
   */
  onUpdateKb: (kbId: string, data: UpdateKbInput) => Promise<void>;
  
  /**
   * Callback to delete KB
   */
  onDeleteKb: (kbId: string) => Promise<void>;
  
  /**
   * Callback to refresh KBs
   */
  onRefreshKbs?: () => void;
  
  // Document management props (for selected KB)
  /**
   * Currently selected KB for document management
   */
  selectedKb?: KnowledgeBase | null;
  
  /**
   * Documents for selected KB
   */
  documents?: KbDocument[];
  
  /**
   * Loading state for documents
   */
  documentsLoading?: boolean;
  
  /**
   * Callback to upload document
   */
  onUploadDocument?: (file: File) => Promise<void>;
  
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
   * Callback when KB is selected for document management
   */
  onSelectKb?: (kb: KnowledgeBase | null) => void;
}

/**
 * Tab panel component
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * OrgAdminKBPage provides a complete UI for managing org knowledge bases.
 */
export function OrgAdminKBPage({
  orgId,
  orgName = 'Organization',
  kbs,
  kbsLoading = false,
  kbsError = null,
  onCreateKb,
  onUpdateKb,
  onDeleteKb,
  onRefreshKbs,
  selectedKb = null,
  documents = [],
  documentsLoading = false,
  onUploadDocument,
  onDeleteDocument,
  onDownloadDocument,
  onRetryDocument,
  onSelectKb,
}: OrgAdminKBPageProps) {
  const [tabValue, setTabValue] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Handle tab change
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0 && onSelectKb) {
      onSelectKb(null);
    }
  };

  /**
   * Handle KB selection for document management
   */
  const handleManageDocuments = useCallback((kbId: string) => {
    const kb = kbs.find(k => k.id === kbId);
    if (kb && onSelectKb) {
      onSelectKb(kb);
      setTabValue(1);
    }
  }, [kbs, onSelectKb]);

  /**
   * Handle document upload
   */
  const handleUpload = useCallback(async (files: File[]) => {
    if (!onUploadDocument || files.length === 0) return;
    setUploadError(null);
    try {
      // DocumentUploadZone passes File[] but onUploadDocument expects single File
      await onUploadDocument(files[0]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [onUploadDocument]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
        <Link href="/admin/org" color="inherit" underline="hover" aria-label="Go to Org Admin">
          Org Admin
        </Link>
        <Typography color="text.primary">KB</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <KBIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">
            Knowledge Bases
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage organization knowledge bases and documents
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            icon={<KBIcon />} 
            iconPosition="start" 
            label="Knowledge Bases" 
          />
          <Tab 
            icon={<DocumentIcon />} 
            iconPosition="start" 
            label={selectedKb ? `Documents: ${selectedKb.name}` : 'Documents'}
            disabled={!selectedKb}
          />
        </Tabs>
      </Paper>

      {/* Knowledge Bases Tab */}
      <TabPanel value={tabValue} index={0}>
        <OrgKBList
          kbs={kbs}
          loading={kbsLoading}
          error={kbsError}
          orgId={orgId}
          onCreate={onCreateKb}
          onUpdate={onUpdateKb}
          onDelete={onDeleteKb}
          onManageDocuments={handleManageDocuments}
        />
      </TabPanel>

      {/* Documents Tab */}
      <TabPanel value={tabValue} index={1}>
        {selectedKb ? (
          <Box>
            {/* Selected KB Info */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h5">{selectedKb.name}</Typography>
              {selectedKb.description && (
                <Typography variant="body2" color="text.secondary">
                  {selectedKb.description}
                </Typography>
              )}
            </Paper>

            {/* Upload Zone */}
            {onUploadDocument && (
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
              canDeleteAll={true}
            />
          </Box>
        ) : (
          <Alert severity="info">
            Select a knowledge base from the list to manage its documents.
          </Alert>
        )}
      </TabPanel>
    </Container>
  );
}
