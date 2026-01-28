"use client";

/**
 * System Eval Admin Page
 *
 * System-level evaluation management page for platform configuration
 * and analytics.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/eval
 */

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { SysEvalAdmin } from "@{{PROJECT_NAME}}/module-eval";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * System Eval Admin Page Component
 *
 * Renders the System Eval admin interface for:
 * - Platform evaluation configuration
 * - System-wide evaluation analytics
 * - Evaluation management across all organizations
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemEvalAdminPage() {
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

  return <SysEvalAdmin />;
}