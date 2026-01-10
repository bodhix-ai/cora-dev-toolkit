"use client";

import { AccessControlAdmin, useUser, createOktaAuthAdapter } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Access Control Admin Page
 * 
 * Platform admin interface for managing:
 * - Organizations
 * - Users
 * - Identity Provider Configuration
 * 
 * Only accessible to platform_owner and platform_admin roles.
 */
export default function AccessControlPage() {
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

  // Create Okta auth adapter
  const authAdapter = createOktaAuthAdapter();

  return <AccessControlAdmin authAdapter={authAdapter} />;
}
