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
import { OrgsTab } from "./OrgsTab";
import { UsersTab } from "./UsersTab";
import { IdpTab } from "./IdpTab";

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
      id={`access-tabpanel-${index}`}
      aria-labelledby={`access-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface AccessControlAdminProps {
  authAdapter: CoraAuthAdapter;
}

/**
 * @component AccessControlAdmin
 * @description Access Control Admin Component - Main admin page for platform-wide access control management
 * 
 * Provides tabbed interface for:
 * - Organizations: List and manage organizations
 * - Users: Platform-wide user management
 * - IDP Config: Identity provider configuration
 * 
 * @routes
 * - GET /admin/sys/access/orgs - List all organizations
 * - POST /admin/sys/access/orgs - Create organization
 * - PUT /admin/sys/access/orgs/{orgId} - Update organization
 * - DELETE /admin/sys/access/orgs/{orgId} - Delete organization
 * - GET /admin/sys/access/users - List all platform users
 * - PUT /admin/sys/access/users/{userId} - Update user (e.g., disable/enable)
 * - DELETE /admin/sys/access/users/{userId} - Delete user
 * - GET /admin/sys/access/idp - Get identity provider configuration
 * - PUT /admin/sys/access/idp - Update identity provider configuration
 */
export function AccessControlAdmin({ authAdapter }: AccessControlAdminProps) {
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
        <Typography color="text.primary">Access</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        Access Control
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage organizations, users, identity providers, and access settings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Access Control tabs"
        >
          <Tab label="Organizations" id="access-tab-0" aria-controls="access-tabpanel-0" />
          <Tab label="Users" id="access-tab-1" aria-controls="access-tabpanel-1" />
          <Tab
            label="IDP Config"
            id="access-tab-2"
            aria-controls="access-tabpanel-2"
          />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <OrgsTab authAdapter={authAdapter} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <UsersTab authAdapter={authAdapter} />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <IdpTab authAdapter={authAdapter} />
      </TabPanel>
    </Box>
  );
}
