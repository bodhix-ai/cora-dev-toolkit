"use client";

/**
 * System Chat Admin Page
 *
 * System-level chat management page for platform configuration,
 * analytics, and session management.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/chat
 */

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { SysChatAdmin } from "@{{PROJECT_NAME}}/module-chat";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * System Chat Admin Page Component
 *
 * Renders the System Chat admin interface with tabs for:
 * - Platform settings configuration
 * - Platform-wide analytics
 * - Session management across all organizations
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemChatAdminPage() {
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

  return <SysChatAdmin />;
}