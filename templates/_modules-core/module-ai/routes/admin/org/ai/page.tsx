/**
 * Organization AI Admin Route
 *
 * Admin page for managing organization-level AI configuration.
 * Allows org admins to set organization-specific AI system prompts.
 *
 * Auth: org_admin or org_owner
 * Breadcrumbs: Org Admin > AI Settings
 */

"use client";

import React from "react";
import {
  useUser,
  useOrganizationContext,
  useRole,
} from "@{{PROJECT_NAME}}/module-access";
import { OrgAIConfigPanel } from "@{{PROJECT_NAME}}/module-ai";
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
} from "@mui/material";
import {
  NavigateNext as NavigateNextIcon,
  Psychology as PsychologyIcon,
} from "@mui/icons-material";
import NextLink from "next/link";
import { createClerkAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { useAuth } from "@clerk/nextjs";

/**
 * Org AI Admin Page Route
 * Renders the OrgAIConfigPanel with organization context.
 */
export default function OrgAIAdminRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin, isSysAdmin } = useRole();
  const clerkAuth = useAuth();
  const authAdapter = createClerkAuthAdapter(clerkAuth);

  // Loading state
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        You must be logged in to access this page.
      </Alert>
    );
  }

  // Organization check
  if (!organization) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Please select an organization to manage AI settings.
      </Alert>
    );
  }

  // Authorization check - org_admin or org_owner required
  if (!isOrgAdmin && !isSysAdmin) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        You do not have permission to access this page. Organization admin or
        owner role required.
      </Alert>
    );
  }


  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
        aria-label="breadcrumb"
      >
        <Link
          component={NextLink}
          href="/admin/org"
          underline="hover"
          color="inherit"
          aria-label="Return to organization admin"
        >
          Org Admin
        </Link>
        <Typography color="text.primary">AI Settings</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <PsychologyIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Box>
          <Typography variant="h4" component="h1">
            AI Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure AI behavior for {organization.orgName}
          </Typography>
        </Box>
      </Box>

      {/* AI Config Panel */}
      <Paper sx={{ p: 3 }}>
        <OrgAIConfigPanel
          organizationId={organization.orgId}
          authAdapter={authAdapter}
        />
      </Paper>
    </Box>
  );
}