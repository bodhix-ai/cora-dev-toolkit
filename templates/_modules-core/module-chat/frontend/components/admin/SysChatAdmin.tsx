/**
 * System Chat Admin Component
 *
 * Main admin page for Chat module system-level management.
 * Provides tabbed interface for:
 * - Platform chat settings configuration
 * - Platform-wide analytics and statistics
 * - Session management across all organizations
 */

import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { SysSettingsTab } from "./SysSettingsTab";
import { SysAnalyticsTab } from "./SysAnalyticsTab";
import { SysSessionsTab } from "./SysSessionsTab";

/**
 * System Chat Admin Page
 *
 * System admins can manage platform-wide chat operations including:
 * - Platform configuration (message retention, limits, defaults)
 * - Platform-wide analytics (usage across all orgs)
 * - Session management (view/delete sessions from any org)
 *
 * ✅ CORRECT: No authentication props needed
 * Tabs handle their own authentication internally via useUser() hook
 *
 * @example
 * ```tsx
 * <SysChatAdmin />
 * ```
 */
export function SysChatAdmin(): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: "100%", p: 3 }}>
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
        <Typography color="text.primary">Chat</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Chat Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage platform-wide chat settings, monitor usage, and administrate chat sessions
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="chat management tabs"
        >
          <Tab label="Settings" id="tab-settings" aria-controls="tabpanel-settings" />
          <Tab label="Analytics" id="tab-analytics" aria-controls="tabpanel-analytics" />
          <Tab label="Sessions" id="tab-sessions" aria-controls="tabpanel-sessions" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-settings" aria-labelledby="tab-settings">
        {activeTab === 0 && <SysSettingsTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-analytics" aria-labelledby="tab-analytics">
        {activeTab === 1 && <SysAnalyticsTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-sessions" aria-labelledby="tab-sessions">
        {activeTab === 2 && <SysSessionsTab />}
      </Box>
    </Box>
  );
}

export default SysChatAdmin;