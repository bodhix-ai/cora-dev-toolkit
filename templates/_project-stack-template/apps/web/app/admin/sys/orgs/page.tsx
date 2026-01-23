"use client";

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { OrganizationManagement } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Organization Management Admin Page
 * 
 * System admin interface for managing organizations.
 * Accessible only to sys_owner and sys_admin roles.
 * 
 * Features:
 * - List all organizations with member counts
 * - Create new organizations
 * - Edit organization details and domain configuration
 * - Configure domain-based auto-provisioning
 * - Delete organizations
 */
export default function OrganizationsAdminPage() {
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

  // Render the organization management component
  return <OrganizationManagement />;
}
