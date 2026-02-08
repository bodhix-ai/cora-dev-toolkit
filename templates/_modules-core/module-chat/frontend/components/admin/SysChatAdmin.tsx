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

import React, { useState, useEffect } from "react";
import { useUser, useRole } from "@ai-mod/module-access";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
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
 * ✅ STANDARD PATTERN (01_std_front_ADMIN-ARCH.md):
 * - Component handles auth, loading internally
 * - No props required - thin wrapper page just renders this component
 * - Passes authAdapter to child tabs
 *
 * @example
 * ```tsx
 * <SysChatAdmin />
 * ```
 */
export function SysChatAdmin(): React.ReactElement {
  // ✅ Auth and context hooks - component is self-sufficient
  const { authAdapter, loading, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();
  
  const [activeTab, setActiveTab] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  // ✅ Extract token from authAdapter (for tabs that need token string)
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setToken(null);
      setTokenLoading(false);
      return;
    }

    const initToken = async () => {
      try {
        const authToken = await authAdapter.getToken();
        setToken(authToken);
      } catch (err) {
        console.error("Failed to retrieve token:", err);
      } finally {
        setTokenLoading(false);
      }
    };

    initToken();
  }, [authAdapter, isAuthenticated]);

  // ✅ Loading state handling (from useUser OR token extraction)
  if (loading || tokenLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Authorization check
  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to access this page. System admin role required.
        </Alert>
      </Box>
    );
  }

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
          Platform Chat Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure platform-wide chat settings, view analytics, and manage sessions across all organizations
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="platform chat management tabs"
        >
          <Tab label="Settings" id="tab-settings" aria-controls="tabpanel-settings" />
          <Tab label="Analytics" id="tab-analytics" aria-controls="tabpanel-analytics" />
          <Tab label="Sessions" id="tab-sessions" aria-controls="tabpanel-sessions" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-settings" aria-labelledby="tab-settings">
        {activeTab === 0 && token && <SysSettingsTab token={token} />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-analytics" aria-labelledby="tab-analytics">
        {activeTab === 1 && token && <SysAnalyticsTab token={token} />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-sessions" aria-labelledby="tab-sessions">
        {activeTab === 2 && token && <SysSessionsTab token={token} />}
      </Box>
    </Box>
  );
}

export default SysChatAdmin;