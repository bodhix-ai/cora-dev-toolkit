"use client";

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";
import { PlatformAdminConfigPage } from "@{{PROJECT_NAME}}/module-ws";

/**
 * Workspace Admin Page
 * 
 * Route: /admin/workspaces
 * Platform admin configuration page for workspace module.
 * 
 * Access: Platform admins only (sys_owner, sys_admin)
 */
export default function WorkspaceAdminPage() {
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

  // Authorization check (sys admin only)
  const isSysAdmin = ['sys_owner', 'sys_admin'].includes(profile.sysRole || '');
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  return <PlatformAdminConfigPage />;
}
