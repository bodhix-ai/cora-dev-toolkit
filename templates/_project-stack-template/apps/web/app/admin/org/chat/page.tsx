"use client";

/**
 * Organization Chat Admin Page
 *
 * Organization-level chat management page for org configuration,
 * session management, and analytics.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/chat
 */

import React from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgChatAdmin } from "@{{PROJECT_NAME}}/module-chat";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Organization Chat Admin Page Component
 *
 * Renders the Organization Chat admin interface with tabs for:
 * - Organization settings configuration
 * - Session management (delete/restore)
 * - Organization analytics
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationChatAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { isOrgAdmin, isOrgOwner } = useRole();  // ✅ FIX: Use boolean flags, not hasRole()

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
  if (!isOrgAdmin && !isOrgOwner) {  // ✅ FIX: Use boolean flags directly
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  return <OrgChatAdmin />;
}