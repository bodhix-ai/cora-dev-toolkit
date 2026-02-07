/**
 * @component OrgKbAdmin
 * @description Organization KB Admin Component - Main admin page for KB module at org level
 *
 * Provides interface for:
 * - Managing organization knowledge bases (CRUD)
 * - Document management for each KB
 * - KB configuration and settings
 *
 * @routes
 * - GET /admin/org/kb/kbs - List org knowledge bases
 * - POST /admin/org/kb/kbs - Create new knowledge base
 * - PUT /admin/org/kb/kbs/{id} - Update knowledge base
 * - DELETE /admin/org/kb/kbs/{id} - Delete knowledge base
 * - GET /admin/org/kb/kbs/{id}/documents - List KB documents
 * - POST /admin/org/kb/kbs/{id}/documents - Upload document
 * - DELETE /admin/org/kb/kbs/{id}/documents/{docId} - Delete document
 */

import React, { useState, useEffect } from 'react';
import { useUser, useRole, useOrganizationContext } from '@ai-mod/module-access';
import { Box, CircularProgress, Alert } from '@mui/material';
import { OrgAdminKBPage } from '../../pages/OrgAdminKBPage';
import { useOrgKbs, useKbDocuments } from '../../hooks';
import { createAuthenticatedClient, createKbModuleClient } from '../../lib/api';
import type { KnowledgeBase } from '../../types';

/**
 * Organization KB Admin Component
 *
 * ✅ STANDARD PATTERN (01_std_front_ADMIN-ARCH.md):
 * - Component handles auth, loading, API client internally
 * - No props required - thin wrapper page just renders this component
 * - Uses authAdapter to create KB module API client
 *
 * @example
 * ```tsx
 * <OrgKbAdmin />
 * ```
 */
export function OrgKbAdmin(): React.ReactElement {
  // ✅ Auth and context hooks - component is self-sufficient
  const { loading, authAdapter, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();

  // Selected KB state for document management
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);

  // API client wrapper for KB module
  const [apiClientWrapper, setApiClientWrapper] = useState<{ kb: ReturnType<typeof createKbModuleClient> } | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

  // ✅ Initialize API client when auth is ready
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setApiClientWrapper(null);
      setClientLoading(false);
      return;
    }

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
      } finally {
        setClientLoading(false);
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
    orgId: currentOrganization?.orgId || null,
    apiClient: apiClientWrapper as any,
    autoFetch: isAuthenticated && !!apiClientWrapper && !!currentOrganization,
  });

  // Document management hook (for selected KB)
  const {
    documents,
    loading: documentsLoading,
    error: documentsError,
    uploadDocument,
    deleteDocument,
    refresh: refreshDocuments,
  } = useKbDocuments({
    kbId: selectedKb?.kbId || null,
    apiClient: apiClientWrapper as any,
    autoFetch: !!selectedKb && !!apiClientWrapper,
  });

  // ✅ Loading state handling (from useUser OR client init)
  if (loading || clientLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Authorization check
  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to access this page. Organization admin role required.
        </Alert>
      </Box>
    );
  }

  // ✅ Organization context check
  if (!currentOrganization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select an organization to manage knowledge bases.
        </Alert>
      </Box>
    );
  }

  // ✅ Render the presentational component with all required props
  return (
    <OrgAdminKBPage
      orgId={currentOrganization.orgId}
      orgName={currentOrganization.orgName}
      kbs={kbs}
      kbsLoading={kbsLoading}
      kbsError={kbsError}
      onCreateKb={createKb}
      onUpdateKb={updateKb}
      onDeleteKb={deleteKb}
      onRefreshKbs={refreshKbs}
      selectedKb={selectedKb}
      onSelectKb={setSelectedKb}
      documents={documents}
      documentsLoading={documentsLoading}
      documentsError={documentsError}
      onUploadDocument={uploadDocument}
      onDeleteDocument={deleteDocument}
      onRefreshDocuments={refreshDocuments}
    />
  );
}

export default OrgKbAdmin;