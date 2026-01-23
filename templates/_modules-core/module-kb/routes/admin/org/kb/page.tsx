/**
 * Organization KB Admin Route
 * 
 * Admin page for managing organization-level knowledge bases.
 * Requires org_admin or org_owner role.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useUser, useOrganizationContext, useApiClient } from '@{{PROJECT_NAME}}/module-access';
import { 
  OrgAdminKBPage, 
  useOrgKbs, 
  useKbDocuments,
  createKbModuleClient,
} from '@{{PROJECT_NAME}}/module-kb';
import type { KnowledgeBase, KbDocument } from '@{{PROJECT_NAME}}/module-kb';
import { CircularProgress, Box, Alert } from '@mui/material';

/**
 * Org KB Admin Page Route
 * Renders the OrgAdminKBPage with data from hooks.
 */
export default function OrgKBAdminRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  const { organization } = useOrganizationContext();
  const apiClient = useApiClient();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }
  
  // Selected KB state for document management
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  
  // Create KB API client
  const kbClient = React.useMemo(
    () => apiClient ? createKbModuleClient(apiClient) : null,
    [apiClient]
  );
  
  // KB management hook
  const {
    kbs,
    loading: kbsLoading,
    error: kbsError,
    createKb,
    updateKb,
    deleteKb,
    refresh: refreshKbs,
  } = useOrgKbs({
    orgId: organization?.id || '',
    apiClient: kbClient,
    autoFetch: !!organization?.id,
  });
  
  // Document management hook (for selected KB)
  const {
    documents,
    loading: documentsLoading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    refresh: refreshDocuments,
  } = useKbDocuments({
    scope: 'kb',
    kbId: selectedKb?.id || undefined,
    apiClient: kbClient,
    autoFetch: !!selectedKb?.id,
  });
  
  // Refresh documents when KB selection changes
  useEffect(() => {
    if (selectedKb?.id) {
      refreshDocuments();
    }
  }, [selectedKb?.id, refreshDocuments]);

  // Check authorization - org admin only (no sys admin access)
  const isOrgAdmin = profile?.orgRole === 'org_owner' || 
                     profile?.orgRole === 'org_admin';
  
  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You do not have permission to access this page.
        </Alert>
      </Box>
    );
  }
  
  if (!organization) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <OrgAdminKBPage
      orgId={organization.id}
      orgName={organization.name}
      kbs={kbs}
      kbsLoading={kbsLoading}
      kbsError={kbsError}
      onCreateKb={createKb}
      onUpdateKb={updateKb}
      onDeleteKb={deleteKb}
      onRefreshKbs={refreshKbs}
      selectedKb={selectedKb}
      documents={documents}
      documentsLoading={documentsLoading}
      onUploadDocument={uploadDocument}
      onDeleteDocument={deleteDocument}
      onDownloadDocument={downloadDocument}
      onSelectKb={setSelectedKb}
    />
  );
}
