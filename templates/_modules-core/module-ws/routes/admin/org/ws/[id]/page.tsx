/**
 * Workspace Detail Admin Route
 * 
 * Organization admin route for detailed workspace management.
 * Provides comprehensive workspace administration capabilities.
 * 
 * Route: /admin/org/ws/[id]
 * Required Roles: org_admin, org_owner
 */

"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { WorkspaceDetailAdminPage } from "@{{PROJECT_NAME}}/module-ws";
import { CircularProgress, Box, Alert } from "@mui/material";

export default function WorkspaceDetailAdminRoute() {
  const params = useParams();
  const { profile, loading, isAuthenticated } = useUser();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }
  
  const workspaceId = params?.id as string;
  const currentOrgId = profile.currentOrgId;

  // Check if user has org admin role for current org (no sys admin access)
  const isOrgAdmin = profile.organizations?.some(
    (org) => org.orgId === currentOrgId && ["org_owner", "org_admin"].includes(org.role)
  );

  // Authorization check
  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }

  // Validate required parameters
  if (!workspaceId || !currentOrgId) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Invalid workspace or organization ID.
        </Alert>
      </Box>
    );
  }

  return (
    <WorkspaceDetailAdminPage
      workspaceId={workspaceId}
      orgId={currentOrgId}
      isOrgAdmin={isOrgAdmin ?? false}
    />
  );
}
