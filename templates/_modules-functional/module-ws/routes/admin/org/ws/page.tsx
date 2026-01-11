"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { createWorkspaceApiClient } from "@{{PROJECT_NAME}}/module-ws";

/**
 * Organization Admin - Workspace Management Page
 * 
 * Route: /admin/org/ws
 * 
 * Allows organization administrators to manage their org's workspaces.
 * This is ORG-LEVEL management that operates on the current organization only.
 * 
 * Features three tabs:
 * - Overview: Workspace list and analytics for this org
 * - Archived: View and restore archived workspaces
 * - Settings: Org-specific workspace settings (override system defaults)
 * 
 * Access: Org admins (org_owner, org_admin) + Platform admins
 * Note: This page REQUIRES current org context from user session
 */

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
      id={`workspace-mgmt-tabpanel-${index}`}
      aria-labelledby={`workspace-mgmt-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function WorkspaceOrgManagementPage() {
  const { profile, loading: userLoading, isAuthenticated, authAdapter } = useUser();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current org from profile
  const currentOrgId = profile?.currentOrgId;

  // Check if user has org admin role
  const isOrgAdmin = profile?.organizations?.some(
    (org) => org.orgId === currentOrgId && ["org_owner", "org_admin"].includes(org.role)
  );

  const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
    profile?.globalRole || ""
  );

  const hasAccess = isOrgAdmin || isPlatformAdmin;

  // Load workspace data
  const loadWorkspaces = useCallback(async () => {
    if (!currentOrgId || !hasAccess) return;

    try {
      setLoading(true);
      setError(null);
      
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Could not retrieve auth token");
        return;
      }
      
      // Call org workspace list API
      const apiClient = createWorkspaceApiClient(token);
      await apiClient.listWorkspaces(currentOrgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, hasAccess, authAdapter]);

  // Load workspaces when component mounts
  useEffect(() => {
    if (isAuthenticated && currentOrgId && hasAccess) {
      loadWorkspaces();
    }
  }, [isAuthenticated, currentOrgId, hasAccess, loadWorkspaces]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Show loading state while user profile is being fetched
  if (userLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Check if user has an organization selected
  if (!currentOrgId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select an organization from the organization switcher to manage workspaces.
        </Alert>
      </Box>
    );
  }

  // Check if user has access to manage org workspaces
  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workspace Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage workspaces for your organization
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="workspace management tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Overview" id="workspace-mgmt-tab-0" aria-controls="workspace-mgmt-tabpanel-0" />
          <Tab label="Archived" id="workspace-mgmt-tab-1" aria-controls="workspace-mgmt-tabpanel-1" />
          <Tab label="Settings" id="workspace-mgmt-tab-2" aria-controls="workspace-mgmt-tabpanel-2" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Active Workspaces
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View and manage your organization's active workspaces
            </Typography>
            <Alert severity="info">
              Workspace list will be displayed here, including:
              <ul>
                <li>Workspace name, description, and owner</li>
                <li>Member count and recent activity</li>
                <li>Quick actions: View, Edit, Archive, Delete</li>
                <li>Bulk operations: Archive multiple, Export list</li>
                <li>Create new workspace button</li>
              </ul>
            </Alert>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Archived Workspaces
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View and restore archived workspaces
            </Typography>
            <Alert severity="info">
              Archived workspace list will be displayed here, including:
              <ul>
                <li>Workspace name and archive date</li>
                <li>Original owner and member count</li>
                <li>Actions: Restore, Permanently Delete</li>
                <li>Auto-delete policy: Archived workspaces deleted after 90 days</li>
              </ul>
            </Alert>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Organization Workspace Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Customize workspace behavior for your organization
            </Typography>
            <Alert severity="info">
              Organization-specific settings will be displayed here:
              <ul>
                <li>Override system default labels (optional)</li>
                <li>Override feature toggles (favorites, tags, colors)</li>
                <li>Set org-specific default color</li>
                <li>Workspace creation permissions (all users vs admins only)</li>
                <li>Archive retention period (override platform default)</li>
              </ul>
            </Alert>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
