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

import React, { useState, useContext, useEffect } from 'react';
import { OrgContext } from '@{{PROJECT_NAME}}/module-access';
import { 
  OrgEvalConfigPage,
  OrgEvalPromptsPage,
  OrgEvalDocTypesPageV2,
  OrgEvalCriteriaPageV2
} from '@{{PROJECT_NAME}}/module-eval';
import { Box, Tabs, Tab, CircularProgress, Alert } from '@mui/material';

type TabValue = 'config' | 'doc-types' | 'criteria' | 'prompts';

export default function OrgEvalAdminPage() {
  const context = useContext(OrgContext);
  const currentOrg = context?.currentOrg;
  const [activeTab, setActiveTab] = useState<TabValue>('config');

  // 🔍 DEBUG LOGGING
  useEffect(() => {
    console.log('[OrgEvalAdminPage] Mounted');
    console.log('[OrgEvalAdminPage] context:', context);
    console.log('[OrgEvalAdminPage] currentOrg:', currentOrg);
    console.log('[OrgEvalAdminPage] activeTab:', activeTab);
  }, [context, currentOrg, activeTab]);

  if (!currentOrg) {
    console.error('[OrgEvalAdminPage] NO currentOrg - showing warning');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select an organization to manage evaluation settings.
        </Alert>
      </Box>
    );
  }

  console.log('[OrgEvalAdminPage] Rendering with orgId:', currentOrg.orgId);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => {
            console.log('[OrgEvalAdminPage] Tab change:', activeTab, '→', newValue);
            setActiveTab(newValue);
          }}
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
          <>
            {console.log('[OrgEvalAdminPage] Rendering CONFIG tab with orgId:', currentOrg.orgId)}
            <OrgEvalConfigPage orgId={currentOrg.orgId} />
          </>
        )}
        {activeTab === 'doc-types' && (
          <>
            {console.log('[OrgEvalAdminPage] Rendering DOC-TYPES tab with orgId:', currentOrg.orgId)}
            <OrgEvalDocTypesPageV2 orgId={currentOrg.orgId} />
          </>
        )}
        {activeTab === 'criteria' && (
          <>
            {console.log('[OrgEvalAdminPage] Rendering CRITERIA tab with orgId:', currentOrg.orgId)}
            <OrgEvalCriteriaPageV2 orgId={currentOrg.orgId} />
          </>
        )}
        {activeTab === 'prompts' && (
          <>
            {console.log('[OrgEvalAdminPage] Rendering PROMPTS tab with orgId:', currentOrg.orgId)}
            <OrgEvalPromptsPage orgId={currentOrg.orgId} />
          </>
        )}
      </Box>
    </Box>
  );
}
