"use client";

import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Breadcrumbs,
  Link,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { ProvidersTab } from "./ProvidersTab";
import { ModelsTab } from "./ModelsTab";
import { PlatformConfigTab } from "./PlatformConfigTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface AIEnablementAdminProps {
  authAdapter: CoraAuthAdapter;
}

export function AIEnablementAdmin({ authAdapter }: AIEnablementAdminProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link
          underline="hover"
          color="inherit"
          href="/admin/sys"
          sx={{ display: "flex", alignItems: "center" }}
          aria-label="Navigate to Sys Admin"
        >
          Sys Admin
        </Link>
        <Typography color="text.primary">AI</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        AI Enablement
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure AI providers, discover and validate models, and manage
        platform AI settings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="AI Enablement tabs"
        >
          <Tab label="Providers" id="ai-tab-0" aria-controls="ai-tabpanel-0" />
          <Tab label="Models" id="ai-tab-1" aria-controls="ai-tabpanel-1" />
          <Tab
            label="Platform Config"
            id="ai-tab-2"
            aria-controls="ai-tabpanel-2"
          />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <ProvidersTab authAdapter={authAdapter} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <ModelsTab authAdapter={authAdapter} />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <PlatformConfigTab authAdapter={authAdapter} />
      </TabPanel>
    </Box>
  );
}
