"use client";

/**
 * Organization Workspace Admin Page
 *
 * Organization-level workspace management page for org configuration
 * and analytics.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/ws
 */

import React from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgWsAdmin } from "@{{PROJECT_NAME}}/module-ws";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Organization Workspace Admin Page Component
 *
 * Renders the Organization Workspace admin interface for:
 * - Organization workspace configuration
 * - Workspace management for the organization
 * - Organization workspace analytics
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationWsAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { hasRole } = useRole();

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

  // Check if user has org admin role
  if (!hasRole("org_owner") && !hasRole("org_admin")) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  return <OrgWsAdmin />;
}