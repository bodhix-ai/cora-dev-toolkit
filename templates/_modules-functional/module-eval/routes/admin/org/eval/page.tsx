'use client';

/**
 * Organization Evaluation Admin Page
 * Path: /admin/org/eval
 * 
 * Single page with tabs for all org eval admin functions:
 * - Configuration (eval_cfg_org)
 * - AI Prompts (eval_cfg_org_prompts) 
 * - Document Types
 * - Evaluation Criteria
 */

import React, { useState } from 'react';
import { useUser, useOrganizationContext } from '@{{PROJECT_NAME}}/module-access';
import { 
  OrgEvalConfigPage,
  OrgEvalPromptsPage,
  OrgEvalDocTypesPageV2,
  OrgEvalCriteriaPageV2
} from '@{{PROJECT_NAME}}/module-eval';
import { Box, Tabs, Tab, CircularProgress, Alert } from '@mui/material';

type TabValue = 'config' | 'doc-types' | 'criteria' | 'prompts';

export default function OrgEvalAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { organization } = useOrganizationContext();
  const [activeTab, setActiveTab] = useState<TabValue>('config');

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

  // Authorization check - org admins only (no sys admin access)
  const isOrgAdmin = ["org_owner", "org_admin"].includes(
    profile.orgRole || ""
  );

  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }

  // Check if organization is selected
  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select an organization to manage evaluation settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="Evaluation admin tabs"
        >
          <Tab label="Configuration" value="config" />
          <Tab label="Document Types" value="doc-types" />
          <Tab label="Criteria" value="criteria" />
          <Tab label="AI Prompts" value="prompts" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {activeTab === 'config' && (
          <OrgEvalConfigPage orgId={organization.id} />
        )}
        {activeTab === 'doc-types' && (
          <OrgEvalDocTypesPageV2 orgId={organization.id} />
        )}
        {activeTab === 'criteria' && (
          <OrgEvalCriteriaPageV2 orgId={organization.id} />
        )}
        {activeTab === 'prompts' && (
          <OrgEvalPromptsPage orgId={organization.id} />
        )}
      </Box>
    </Box>
  );
}
