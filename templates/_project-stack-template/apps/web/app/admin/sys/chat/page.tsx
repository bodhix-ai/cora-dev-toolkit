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

import React, { useEffect, useState } from "react";
import { useUser, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/module-access";
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
 * 
 * ✅ KB PATTERN: Create authenticated API client at page level
 * - Get token ONCE at mount
 * - Create authenticated client
 * - Pass client (not authAdapter) to component
 */
export default function SystemChatAdminPage() {
  const { profile, loading, isAuthenticated, authAdapter } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Get token ONCE when auth is ready
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setToken(null);
      return;
    }

    const initToken = async () => {
      try {
        const authToken = await authAdapter.getToken();
        if (authToken) {
          setToken(authToken);
          setTokenError(null);
        } else {
          setTokenError("Failed to retrieve authentication token");
        }
      } catch (err) {
        console.error('Failed to retrieve authentication token:', err);
        setTokenError("Failed to retrieve authentication token");
      }
    };

    initToken();
  }, [authAdapter, isAuthenticated]);

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

  // Show error if token retrieval failed
  if (tokenError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {tokenError}
        </Alert>
      </Box>
    );
  }

  // Show loading while token is being retrieved
  if (!token) {
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

  // ✅ KB PATTERN: Pass token (retrieved once at mount)
  return <SysChatAdmin token={token} />;
}
