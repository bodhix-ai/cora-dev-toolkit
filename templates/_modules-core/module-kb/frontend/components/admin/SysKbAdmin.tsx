/**
 * @component SysKbAdmin
 * @description System KB Admin Component - Main admin page for KB module at system level
 *
 * Provides interface for:
 * - Managing system knowledge bases (CRUD)
 * - Document management for each KB
 * - Organization associations for KBs
 *
 * @routes
 * - GET /admin/sys/kb/kbs - List system knowledge bases
 * - POST /admin/sys/kb/kbs - Create new knowledge base
 * - PUT /admin/sys/kb/kbs/{id} - Update knowledge base
 * - DELETE /admin/sys/kb/kbs/{id} - Delete knowledge base
 * - GET /admin/sys/kb/kbs/{id}/documents - List KB documents
 * - POST /admin/sys/kb/kbs/{id}/documents - Upload document
 * - DELETE /admin/sys/kb/kbs/{id}/documents/{docId} - Delete document
 * - GET /admin/sys/kb/orgs - List organizations for association
 * - GET /admin/sys/kb/kbs/{id}/orgs - List orgs associated with KB
 * - POST /admin/sys/kb/kbs/{id}/orgs/{orgId} - Associate KB with org
 * - DELETE /admin/sys/kb/kbs/{id}/orgs/{orgId} - Remove KB-org association
 */

import React, { useState, useEffect } from 'react';
import { useUser, useRole } from '@{{PROJECT_NAME}}/module-access';
import { Box, CircularProgress, Alert } from '@mui/material';
import { PlatformAdminKBPage } from '../../pages/PlatformAdminKBPage';
import { useSysKbs, useKbDocuments } from '../../hooks';
import { createAuthenticatedClient, createKbModuleClient } from '../../lib/api';
import type { KnowledgeBase, CreateKbInput, UpdateKbInput } from '../../types';

/**
 * System KB Admin Component
 *
 * ✅ STANDARD PATTERN (01_std_front_ADMIN-ARCH.md):
 * - Component handles auth, loading, API client internally
 * - No props required - thin wrapper page just renders this component
 * - Extracts token from authAdapter for system-level operations
 *
 * @example
 * ```tsx
 * <SysKbAdmin />
 * ```
 */
export function SysKbAdmin(): React.ReactElement {
  // ✅ Auth hooks - component is self-sufficient
  const { loading, authAdapter, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();

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
  } = useSysKbs({
    apiClient: apiClientWrapper as any,
    autoFetch: isAuthenticated && !!apiClientWrapper,
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
    scope: 'kb',
    scopeId: selectedKb?.id || null,
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
  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to access this page. System admin role required.
        </Alert>
      </Box>
    );
  }

  // ✅ Render the presentational component with all required props
  return (
    <PlatformAdminKBPage
      kbs={kbs}
      kbsLoading={kbsLoading}
      kbsError={kbsError}
      onCreateKb={async (data: CreateKbInput) => { await createKb(data); }}
      onUpdateKb={async (kbId: string, data: UpdateKbInput) => { await updateKb(kbId, data); }}
      onDeleteKb={deleteKb}
      onRefreshKbs={refreshKbs}
      selectedKb={selectedKb}
      documents={documents}
      documentsLoading={documentsLoading}
      onUploadDocument={async (file: File) => { await uploadDocument(file); }}
      onDeleteDocument={deleteDocument}
    />
  );
}

export default SysKbAdmin;