/**
 * System KB Admin Route
 * 
 * Admin page for managing system (global) knowledge bases.
 * Requires platform admin role (sys_owner or sys_admin).
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useUser, useApiClient } from '@{{PROJECT_NAME}}/module-access';
import { 
  PlatformAdminKBPage, 
  useSysKbs, 
  useKbDocuments,
  createKbModuleClient,
} from '@{{PROJECT_NAME}}/module-kb';
import type { KnowledgeBase } from '@{{PROJECT_NAME}}/module-kb';
import { CircularProgress, Box, Alert } from '@mui/material';

/**
 * Organization info for association management
 */
interface OrgInfo {
  id: string;
  name: string;
  isAssociated: boolean;
}

/**
 * System KB Admin Page Route
 * Renders the PlatformAdminKBPage with data from hooks.
 */
export default function SysKBAdminRoute() {
  const { profile } = useUser();
  const apiClient = useApiClient();
  
  // Selected KB state for document management
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  
  // Org associations state
  const [allOrgs, setAllOrgs] = useState<OrgInfo[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  
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
    associateOrg,
    removeOrg,
    refresh: refreshKbs,
  } = useSysKbs({
    apiClient: kbClient,
    autoFetch: true,
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
  
  // Calculate org counts
  const orgCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    // This would be populated from the API in production
    // For now, return empty counts
    return counts;
  }, [kbs]);
  
  // Refresh documents when KB selection changes
  useEffect(() => {
    if (selectedKb?.id) {
      refreshDocuments();
    }
  }, [selectedKb?.id, refreshDocuments]);

  /**
   * Load org associations for a KB
   */
  const handleLoadOrgAssociations = async (kbId: string) => {
    setOrgsLoading(true);
    try {
      // In production, this would call the API to get:
      // 1. All organizations
      // 2. Which organizations have access to this KB
      // For now, set empty array
      setAllOrgs([]);
    } finally {
      setOrgsLoading(false);
    }
  };

  /**
   * Handle org association
   */
  const handleAssociateOrg = async (kbId: string, orgId: string) => {
    await associateOrg(kbId, orgId);
    // Refresh the org list to show updated status
    await handleLoadOrgAssociations(kbId);
    refreshKbs();
  };

  /**
   * Handle org removal
   */
  const handleRemoveOrg = async (kbId: string, orgId: string) => {
    await removeOrg(kbId, orgId);
    // Refresh the org list to show updated status
    await handleLoadOrgAssociations(kbId);
    refreshKbs();
  };

  // Check authorization
  const isAuthorized = profile?.sysRole === 'sys_owner' || 
                       profile?.sysRole === 'sys_admin';
  
  if (!isAuthorized) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You do not have permission to access this page. Platform admin role required.
        </Alert>
      </Box>
    );
  }
  
  if (!apiClient) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PlatformAdminKBPage
      kbs={kbs}
      kbsLoading={kbsLoading}
      kbsError={kbsError}
      onCreateKb={createKb}
      onUpdateKb={updateKb}
      onDeleteKb={deleteKb}
      onRefreshKbs={refreshKbs}
      orgCounts={orgCounts}
      selectedKb={selectedKb}
      documents={documents}
      documentsLoading={documentsLoading}
      onUploadDocument={uploadDocument}
      onDeleteDocument={deleteDocument}
      onDownloadDocument={downloadDocument}
      onSelectKb={setSelectedKb}
      allOrgs={allOrgs}
      orgsLoading={orgsLoading}
      onAssociateOrg={handleAssociateOrg}
      onRemoveOrg={handleRemoveOrg}
      onLoadOrgAssociations={handleLoadOrgAssociations}
    />
  );
}
