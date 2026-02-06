/**
 * @component OrgChatAdmin
 * @description Organization Chat Admin Component - Main admin page for Chat module organization-level management
 * 
 * Provides tabbed interface for:
 * - Organization chat settings (overrides)
 * - Organization session management (view, delete, restore)
 * - Organization analytics and usage stats
 * 
 * @routes
 * - GET /admin/org/chat/config - Get organization chat configuration
 * - PUT /admin/org/chat/config - Update organization chat configuration
 * - GET /admin/org/chat/sessions - List organization chat sessions
 * - GET /admin/org/chat/sessions/{id} - Get session details
 * - DELETE /admin/org/chat/sessions/{id} - Delete chat session
 * - POST /admin/org/chat/sessions/{id}/restore - Restore deleted session
 * - GET /admin/org/chat/analytics - Get organization chat analytics
 * - GET /admin/org/chat/analytics/users - Get user activity stats
 * - GET /admin/org/chat/analytics/workspaces - Get workspace activity stats
 * - GET /admin/org/chat/messages/{id} - View message content (read-only)
 */

import React, { useState } from "react";
import type { AuthAdapter } from "@{{PROJECT_NAME}}/module-access";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { OrgSettingsTab } from "./OrgSettingsTab";
import { OrgSessionsTab } from "./OrgSessionsTab";
import { OrgAnalyticsTab } from "./OrgAnalyticsTab";

interface OrgChatAdminProps {
  authAdapter: AuthAdapter;
  orgId: string;
  orgName?: string;
}

/**
 * Organization Chat Admin Page
 *
 * Organization admins can manage organization-level chat operations including:
 * - Organization configuration (message retention, limits)
 * - Session management (view/delete/restore sessions)
 * - Organization analytics (usage by users/workspaces)
 *
 * ✅ STANDARD PATTERN: Receives authAdapter from page, passes to tabs
 * Follows KB admin component pattern for consistent authentication.
 *
 * @example
 * ```tsx
 * <OrgChatAdmin authAdapter={authAdapter} />
 * ```
 */
export function OrgChatAdmin({ authAdapter, orgId, orgName }: OrgChatAdminProps): React.ReactElement {
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
          href="/admin/org"
          sx={{ display: "flex", alignItems: "center" }}
          aria-label="Navigate to Org Admin"
        >
          Org Admin
        </Link>
        <Typography color="text.primary">Chat</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Chat Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage organization chat settings, monitor usage, and administrate chat sessions
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="chat management tabs"
        >
          <Tab label="Settings" id="tab-settings" aria-controls="tabpanel-settings" />
          <Tab label="Sessions" id="tab-sessions" aria-controls="tabpanel-sessions" />
          <Tab label="Analytics" id="tab-analytics" aria-controls="tabpanel-analytics" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-settings" aria-labelledby="tab-settings">
        {activeTab === 0 && <OrgSettingsTab authAdapter={authAdapter} orgId={orgId} />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-sessions" aria-labelledby="tab-sessions">
        {activeTab === 1 && <OrgSessionsTab authAdapter={authAdapter} orgId={orgId} />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-analytics" aria-labelledby="tab-analytics">
        {activeTab === 2 && <OrgAnalyticsTab authAdapter={authAdapter} orgId={orgId} />}
      </Box>
    </Box>
  );
}

export default OrgChatAdmin;