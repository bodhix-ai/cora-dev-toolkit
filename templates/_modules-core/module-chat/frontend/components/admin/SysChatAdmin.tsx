/**
 * @component SysChatAdmin
 * @description System Chat Admin Component - Main admin page for Chat module system-level management
 * 
 * Provides tabbed interface for:
 * - Platform chat settings configuration
 * - Platform-wide analytics and statistics
 * - Session management across all organizations
 * 
 * @routes
 * - GET /admin/sys/chat/config - Get platform chat configuration
 * - PUT /admin/sys/chat/config - Update platform chat configuration
 * - GET /admin/sys/chat/analytics - Get platform-wide analytics
 * - GET /admin/sys/chat/analytics/usage - Get usage statistics by organization
 * - GET /admin/sys/chat/analytics/tokens - Get token usage statistics
 * - GET /admin/sys/chat/sessions - List all chat sessions (all orgs)
 * - GET /admin/sys/chat/sessions/{id} - Get session details (sys admin view)
 * - DELETE /admin/sys/chat/sessions/{id} - Force delete chat session
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

interface SysChatAdminProps {
  token: string;
}

/**
 * System Chat Admin Page
 *
 * System admins can manage platform-wide chat operations including:
 * - Platform configuration (message retention, limits, defaults)
 * - Platform-wide analytics (usage across all orgs)
 * - Session management (view/delete sessions from any org)
 *
 * ✅ KB PATTERN: Receives token (extracted once at page level)
 * - Token retrieved once at mount, no repeated calls
 * - Tabs receive token and pass to API functions
 * - API functions accept token string directly
 *
 * @example
 * ```tsx
 * <SysChatAdmin token={token} />
 * ```
 */
export function SysChatAdmin({ token }: SysChatAdminProps): React.ReactElement {
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
        {activeTab === 0 && <SysSettingsTab token={token} />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-analytics" aria-labelledby="tab-analytics">
        {activeTab === 1 && <SysAnalyticsTab token={token} />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-sessions" aria-labelledby="tab-sessions">
        {activeTab === 2 && <SysSessionsTab token={token} />}
      </Box>
    </Box>
  );
}

export default SysChatAdmin;
