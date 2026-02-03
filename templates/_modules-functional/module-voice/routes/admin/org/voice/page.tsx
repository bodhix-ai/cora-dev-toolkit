/**
 * Organization Voice Configuration Route
 * 
 * Admin page for managing organization-level voice interview settings.
 * 
 * Auth: org_admin, org_owner, OR sys_admin (ADR-016)
 * Breadcrumbs: Org Admin > Voice
 */

"use client";

import React from "react";
import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Alert,
  Typography,
  Link,
} from "@mui/material";
import { NavigateNext } from "@mui/icons-material";
import NextLink from "next/link";
import { useUser, useOrganizationContext, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgVoiceConfigPage } from "@{{PROJECT_NAME}}/module-voice";

export default function OrgVoiceConfigRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin } = useRole();

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

  // Authorization check - org admins only (revised ADR-016)
  // Sys admins needing access should add themselves to the org
  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }

  // Organization context check
  if (!organization?.orgId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumbs: Org Admin > Voice */}
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        sx={{ mb: 2 }}
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
        <Typography color="text.primary">Voice</Typography>
      </Breadcrumbs>

      {/* Render OrgVoiceConfigPage with orgId */}
      <OrgVoiceConfigPage orgId={organization.orgId} />
    </Box>
  );
}