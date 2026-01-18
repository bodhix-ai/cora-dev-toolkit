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

import React, { useState, useContext } from 'react';
import { OrgContext } from '@{project}/module-access';
import { 
  OrgEvalConfigPage,
  OrgEvalPromptsPage,
  OrgEvalDocTypesPage,
  OrgEvalCriteriaPage
} from '@{project}/module-eval';
import { Box, Tabs, Tab, CircularProgress, Alert } from '@mui/material';

type TabValue = 'config' | 'doc-types' | 'criteria' | 'prompts';

export default function OrgEvalAdminPage() {
  const context = useContext(OrgContext);
  const currentOrg = context?.currentOrg;
  const [activeTab, setActiveTab] = useState<TabValue>('config');

  if (!currentOrg) {
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
        {activeTab === 'config' && <OrgEvalConfigPage orgId={currentOrg.id} />}
        {activeTab === 'doc-types' && <OrgEvalDocTypesPage orgId={currentOrg.id} />}
        {activeTab === 'criteria' && <OrgEvalCriteriaPage orgId={currentOrg.id} />}
        {activeTab === 'prompts' && <OrgEvalPromptsPage orgId={currentOrg.id} />}
      </Box>
    </Box>
  );
}
