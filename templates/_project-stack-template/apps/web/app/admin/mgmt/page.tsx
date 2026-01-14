"use client";

/**
 * System Management Admin Page
 *
 * System-level management page for Lambda warming, performance monitoring,
 * storage management, and cost tracking.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/mgmt
 */

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { PlatformMgmtAdmin } from "@{{PROJECT_NAME}}/module-mgmt";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * System Management Admin Page Component
 *
 * Renders the System Management admin interface with tabs for:
 * - Lambda warming schedule management
 * - Performance monitoring (planned)
 * - Storage management (planned)
 * - Cost tracking (planned)
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemManagementPage() {
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

  return <PlatformMgmtAdmin />;
}
