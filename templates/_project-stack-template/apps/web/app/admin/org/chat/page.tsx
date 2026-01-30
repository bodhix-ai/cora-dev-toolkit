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
 * 
 * ✅ STANDARD PATTERN: Follows KB admin page pattern
 * - Extract authAdapter at page level
 * - Pass authAdapter down to component
 * - Component passes to tabs
 * - Tabs pass to API functions
 */
export default function OrganizationChatAdminPage() {
  const { profile, loading, isAuthenticated, authAdapter } = useUser();
  const { isOrgAdmin, isOrgOwner } = useRole();

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

  // ✅ STANDARD PATTERN: Pass authAdapter to component
  return <OrgChatAdmin authAdapter={authAdapter} />;
}
