/**
 * @component OrgWsDetailAdminComponent
 * @description Workspace Detail Admin Component
 * 
 * Organization admin component for detailed workspace management.
 * Provides comprehensive workspace administration capabilities.
 * 
 * @routes
 * - GET /admin/org/ws/{id} - Workspace detail admin page
 */

"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { WorkspaceDetailAdminPage } from "@{{PROJECT_NAME}}/module-ws";
import { CircularProgress, Box, Alert } from "@mui/material";

export function OrgWsDetailAdminComponent() {
  const params = useParams();
  const { loading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const { orgId } = useOrganizationContext();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }
  
  const workspaceId = params?.id as string;

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
  if (!workspaceId || !orgId) {
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
      orgId={orgId}
      isOrgAdmin={isOrgAdmin}
    />
  );
}

export default OrgWsDetailAdminComponent;