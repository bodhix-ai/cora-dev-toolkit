"use client";

/**
 * Organization Voice Admin Page
 *
 * Organization-level voice configuration management page for org
 * credentials and settings.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/voice
 */

import React from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgVoiceAdmin } from "@{{PROJECT_NAME}}/module-voice";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Organization Voice Admin Page Component
 *
 * Renders the Organization Voice admin interface for:
 * - Organization voice provider credentials
 * - Voice interview configuration for the organization
 * - Organization voice analytics
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationVoiceAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();

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
  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  return <OrgVoiceAdmin />;
}