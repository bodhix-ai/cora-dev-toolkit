'use client';

/**
 * System Evaluation Admin Page
 * Path: /admin/sys/eval
 * 
 * Single page with tabs for all sys eval admin functions:
 * - Configuration (eval_cfg_sys)
 * - AI Prompts (eval_cfg_sys_prompts)
 */

import React, { useState } from 'react';
import { 
  SysEvalConfigPage,
  SysEvalPromptsPage
} from '@{project}/module-eval';
import { Box, Tabs, Tab } from '@mui/material';

type TabValue = 'config' | 'prompts';

export default function SysEvalAdminPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('config');

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="System evaluation admin tabs"
        >
          <Tab label="Configuration" value="config" />
          <Tab label="AI Prompts" value="prompts" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {activeTab === 'config' && <SysEvalConfigPage />}
        {activeTab === 'prompts' && <SysEvalPromptsPage />}
      </Box>
    </Box>
  );
}
