"use client";

import { AccessControlAdmin, useUser, useRole, createOktaAuthAdapter } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Access Control Admin Page
 * 
 * System admin interface for managing:
 * - Organizations
 * - Users
 * - Identity Provider Configuration
 * 
 * Only accessible to sys_owner and sys_admin roles.
 */
export default function AccessControlPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();

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
  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to system administrators.
        </Alert>
      </Box>
    );
  }

  // Create Okta auth adapter
  const authAdapter = createOktaAuthAdapter();

  return <AccessControlAdmin authAdapter={authAdapter} />;
}
