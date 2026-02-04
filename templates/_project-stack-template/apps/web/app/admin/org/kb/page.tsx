/**
 * Organization KB Admin Route
 * 
 * Admin page for managing organization-level knowledge bases.
 * Requires org_admin or org_owner role.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useUser, useOrganizationContext, useRole } from '@{{PROJECT_NAME}}/module-access';
import { 
  OrgAdminKBPage, 
  useOrgKbs, 
  useKbDocuments,
  createAuthenticatedClient,
  createKbModuleClient,
} from '@{{PROJECT_NAME}}/module-kb';
import type { KnowledgeBase } from '@{{PROJECT_NAME}}/module-kb';
import { CircularProgress, Box, Alert } from '@mui/material';

/**
 * Org KB Admin Page Route
 * Renders the OrgAdminKBPage with data from hooks.
 */
export default function OrgKBAdminRoute() {
  // ✅ ALL HOOKS AT TOP (before any conditional returns)
  const { profile, loading, isAuthenticated, authAdapter } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin } = useRole();
  
  // Selected KB state for document management
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  
  // Create API client wrapper for KB module
  const [apiClientWrapper, setApiClientWrapper] = useState<{ kb: ReturnType<typeof createKbModuleClient> } | null>(null);
  
  // Initialize API client when auth is ready
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setApiClientWrapper(null);
      return;
    }
    
    // Create API client wrapper
    const initClient = async () => {
      try {
        const token = await authAdapter.getToken();
        if (token) {
          const authenticatedClient = createAuthenticatedClient(token);
          const kbClient = createKbModuleClient(authenticatedClient);
          setApiClientWrapper({ kb: kbClient });
        }
      } catch (err) {
        console.error('Failed to initialize KB API client:', err);
        setApiClientWrapper(null);
      }
    };
    
    initClient();
  }, [authAdapter, isAuthenticated]);
  
  // KB management hook with API client
  const {
    kbs,
    loading: kbsLoading,
    error: kbsError,
    createKb,
    updateKb,
    deleteKb,
    refresh: refreshKbs,
  } = useOrgKbs({
    orgId: organization?.orgId || null,
    apiClient: apiClientWrapper as any,
    autoFetch: isAuthenticated && !!apiClientWrapper,
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
    autoFetch: !!selectedKb?.id,
  });
  
  // Refresh documents when KB selection changes
  useEffect(() => {
    if (selectedKb?.id) {
      refreshDocuments();
    }
  }, [selectedKb?.id, refreshDocuments]);

  // ✅ NOW conditional returns (after all hooks)
  
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

  // Check authorization - org admins only (revised ADR-016)
  // Sys admins needing access should add themselves to the org
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
      orgId={organization.orgId}
      orgName={organization.orgName}
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