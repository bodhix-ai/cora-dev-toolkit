"use client";

/**
 * Platform Management Admin Page
 *
 * Platform-level management page for Lambda warming, performance monitoring,
 * storage management, and cost tracking.
 *
 * Access: Platform admins only (platform_owner, platform_admin)
 *
 * @example
 * Route: /admin/mgmt
 */

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { PlatformMgmtAdmin } from "@{{PROJECT_NAME}}/module-mgmt";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Platform Management Admin Page Component
 *
 * Renders the Platform Management admin interface with tabs for:
 * - Lambda warming schedule management
 * - Performance monitoring (planned)
 * - Storage management (planned)
 * - Cost tracking (planned)
 *
 * Requires platform admin role (platform_owner or platform_admin).
 */
export default function PlatformManagementPage() {
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

  // Check if user has platform admin role
  const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
    profile.globalRole || ""
  );

  if (!isPlatformAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to platform administrators.
        </Alert>
      </Box>
    );
  }

  return <PlatformMgmtAdmin />;
}
