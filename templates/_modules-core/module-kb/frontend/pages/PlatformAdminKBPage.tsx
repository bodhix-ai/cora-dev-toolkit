/**
 * PlatformAdminKBPage Component
 * 
 * Full-page view for system (global) KB management.
 * Provides CRUD operations and org association management.
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  LibraryBooks as KBIcon,
  Description as DocumentIcon,
  Business as OrgIcon,
  Public as GlobalIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { SysKBList } from '../components/admin/SysKBList';
import { DocumentTable } from '../components/DocumentTable';
import { DocumentUploadZone } from '../components/DocumentUploadZone';
import type { 
  KnowledgeBase, 
  CreateKbInput, 
  UpdateKbInput,
  KbDocument,
} from '../types';

/**
 * Organization info for association management
 */
interface OrgInfo {
  id: string;
  name: string;
  isAssociated: boolean;
}

interface PlatformAdminKBPageProps {
  /**
   * List of system KBs
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
  
  /**
   * Number of orgs associated with each KB
   */
  orgCounts?: Record<string, number>;
  
  // Document management props
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
   * Callback when KB is selected
   */
  onSelectKb?: (kb: KnowledgeBase | null) => void;
  
  // Org association props
  /**
   * List of all organizations for association management
   */
  allOrgs?: OrgInfo[];
  
  /**
   * Loading state for orgs
   */
  orgsLoading?: boolean;
  
  /**
   * Callback to associate KB with org
   */
  onAssociateOrg?: (kbId: string, orgId: string) => Promise<void>;
  
  /**
   * Callback to remove org association
   */
  onRemoveOrg?: (kbId: string, orgId: string) => Promise<void>;
  
  /**
   * Callback to load org associations for a KB
   */
  onLoadOrgAssociations?: (kbId: string) => void;
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
 * PlatformAdminKBPage provides a complete UI for managing system knowledge bases.
 */
export function PlatformAdminKBPage({
  kbs,
  kbsLoading = false,
  kbsError = null,
  onCreateKb,
  onUpdateKb,
  onDeleteKb,
  onRefreshKbs,
  orgCounts = {},
  selectedKb = null,
  documents = [],
  documentsLoading = false,
  onUploadDocument,
  onDeleteDocument,
  onDownloadDocument,
  onRetryDocument,
  onSelectKb,
  allOrgs = [],
  orgsLoading = false,
  onAssociateOrg,
  onRemoveOrg,
  onLoadOrgAssociations,
}: PlatformAdminKBPageProps) {
  const [tabValue, setTabValue] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Org association dialog state
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgDialogKbId, setOrgDialogKbId] = useState<string | null>(null);
  const [associationInProgress, setAssociationInProgress] = useState<string | null>(null);

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
   * Handle org management
   */
  const handleManageOrgs = useCallback((kbId: string) => {
    setOrgDialogKbId(kbId);
    setOrgDialogOpen(true);
    if (onLoadOrgAssociations) {
      onLoadOrgAssociations(kbId);
    }
  }, [onLoadOrgAssociations]);

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

  /**
   * Handle org association toggle
   */
  const handleToggleOrg = useCallback(async (orgId: string, isAssociated: boolean) => {
    if (!orgDialogKbId) return;
    
    setAssociationInProgress(orgId);
    try {
      if (isAssociated && onRemoveOrg) {
        await onRemoveOrg(orgDialogKbId, orgId);
      } else if (!isAssociated && onAssociateOrg) {
        await onAssociateOrg(orgDialogKbId, orgId);
      }
    } finally {
      setAssociationInProgress(null);
    }
  }, [orgDialogKbId, onAssociateOrg, onRemoveOrg]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
        <Link href="/admin" color="inherit" underline="hover" aria-label="Go to Admin dashboard">
          Admin
        </Link>
        <Link href="/admin/sys" color="inherit" underline="hover" aria-label="Go to System settings">
          System
        </Link>
        <Typography color="text.primary">Knowledge Bases</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <GlobalIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">
            System Knowledge Bases
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage platform-wide knowledge bases shared across organizations
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
        <SysKBList
          kbs={kbs}
          loading={kbsLoading}
          error={kbsError}
          onCreate={onCreateKb}
          onUpdate={onUpdateKb}
          onDelete={onDeleteKb}
          onManageDocuments={handleManageDocuments}
          onManageOrgs={handleManageOrgs}
          orgCounts={orgCounts}
        />
      </TabPanel>

      {/* Documents Tab */}
      <TabPanel value={tabValue} index={1}>
        {selectedKb ? (
          <Box>
            {/* Selected KB Info */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <GlobalIcon color="primary" />
                <Typography variant="h5">{selectedKb.name}</Typography>
              </Box>
              {selectedKb.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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

      {/* Org Association Dialog */}
      <Dialog
        open={orgDialogOpen}
        onClose={() => setOrgDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <OrgIcon />
            <span>Manage Organization Access</span>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {orgsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : allOrgs.length === 0 ? (
            <Alert severity="info">
              No organizations available.
            </Alert>
          ) : (
            <List>
              {allOrgs.map((org) => (
                <ListItem key={org.id}>
                  <Checkbox
                    checked={org.isAssociated}
                    onChange={() => handleToggleOrg(org.id, org.isAssociated)}
                    disabled={associationInProgress === org.id}
                    inputProps={{ 'aria-label': `Toggle access for ${org.name}` }}
                  />
                  <ListItemText
                    primary={org.name}
                    secondary={org.isAssociated ? 'Has access' : 'No access'}
                  />
                  <ListItemSecondaryAction>
                    {associationInProgress === org.id && (
                      <CircularProgress size={20} />
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrgDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
