"use client";

/**
 * System Workspace Admin Page
 *
 * System-level workspace management page for platform configuration
 * and analytics.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/ws
 */

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { SysWsAdmin } from "@{{PROJECT_NAME}}/module-ws";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * System Workspace Admin Page Component
 *
 * Renders the System Workspace admin interface for:
 * - Platform workspace configuration
 * - System-wide workspace analytics
 * - Workspace management across all organizations
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemWsAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();

  // Show loading state while user profile is being fetched
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
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

  // Check if user has system admin role
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    profile.sysRole || ""
  );

  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to system administrators.
        </Alert>
      </Box>
    );
  }

  return <SysWsAdmin />;
}