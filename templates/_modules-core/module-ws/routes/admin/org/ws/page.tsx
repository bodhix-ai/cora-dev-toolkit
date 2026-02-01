"use client";

import React from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
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
 * Access: Org admins (org_owner, org_admin)
 * Note: This page REQUIRES current org context from user session
 * 
 * Authorization: ADR-019a compliant (useRole + useOrganizationContext)
 */

export default function WorkspaceOrgManagementRoute() {
  const { loading: userLoading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const { orgId, organization } = useOrganizationContext();

  // Org admin pages should only check org roles
  const hasAccess = isOrgAdmin;

  // Show loading state while user profile is being fetched
  if (userLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Check if user has an organization selected
  if (!orgId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select an organization from the organization switcher to manage workspaces.
        </Alert>
      </Box>
    );
  }

  // Authorization check
  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }

  // Render the full OrgAdminManagementPage component with proper props
  return (
    <OrgAdminManagementPage
      orgId={orgId}
      isOrgAdmin={hasAccess}
    />
  );
}
