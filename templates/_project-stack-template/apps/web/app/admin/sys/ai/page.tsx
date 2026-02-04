"use client";

import React from "react";
import { AIEnablementAdmin } from "@{{PROJECT_NAME}}/module-ai";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * AI Enablement Admin Page
 * 
 * System admin interface for managing AI providers, models, and configuration.
 * Accessible only to sys_owner and sys_admin roles.
 * 
 * Features:
 * - Manage AI providers (OpenAI, Anthropic, Azure OpenAI, etc.)
 * - Test provider connections and credentials
 * - Discover and validate AI models
 * - View model availability and capabilities
 * - Configure system-wide AI defaults (chat model, embedding model, system prompt)
 */
export default function AIAdminPage() {
  const { profile, loading, isAuthenticated, authAdapter } = useUser();
  const { isSysAdmin } = useRole();

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

  // Authorization check - system admins only
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }
  
  return <AIEnablementAdmin authAdapter={authAdapter} />;
}
