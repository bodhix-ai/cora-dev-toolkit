"use client";

import React from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { OrgAdminManagementPage } from "@{{PROJECT_NAME}}/module-ws";

/**
 * Organization Admin - Workspace Management Page
 * 
 * Route: /admin/org/ws
 * 
 * Allows organization administrators to manage their org's workspaces.
 * This is ORG-LEVEL management that operates on the current organization only.
 * 
 * Features three tabs:
 * - All Workspaces: Complete workspace list with bulk operations
 * - Analytics: Workspace usage statistics and insights
 * - Settings: Organization-level workspace settings
 * 
 * Access: Org admins (org_owner, org_admin) + Platform admins
 * Note: This page REQUIRES current org context from user session
 */

export default function WorkspaceOrgManagementRoute() {
  const { profile, loading: userLoading, isAuthenticated } = useUser();

  // Get current org from profile
  const currentOrgId = profile?.currentOrgId;

  // Check if user has org admin role for current org
  const isOrgAdmin = profile?.organizations?.some(
    (org) => org.orgId === currentOrgId && ["org_owner", "org_admin"].includes(org.role)
  );

  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    profile?.sysRole || ""
  );

  const hasAccess = isOrgAdmin || isSysAdmin;

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

  // Render the full OrgAdminManagementPage component with proper props
  return (
    <OrgAdminManagementPage
      orgId={currentOrgId}
      isOrgAdmin={hasAccess}
    />
  );
}
