"use client";

import { useUser, useOrganizationContext, useRole } from "@{{PROJECT_NAME}}/module-access";
import OrgModuleConfigPage from "@{{PROJECT_NAME}}/module-mgmt/frontend/pages/OrgModuleConfigPage";
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
  Settings as SettingsIcon,
} from "@mui/icons-material";
import NextLink from "next/link";

/**
 * Organization Admin Module Configuration Route
 * 
 * Allows org admins to configure which modules are enabled for their organization.
 * 
 * Auth: org_admin or org_owner
 * Breadcrumbs: Org Admin > Module Configuration
 */
export default function OrgModuleConfigRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin, role } = useRole();

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

  // Authorization check - org admins only
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
  if (!organization) {
    return (
      <Box p={4}>
        <Alert severity="warning">
          Please select an organization to manage modules.
        </Alert>
      </Box>
    );
  }

  const isOwner = role === "org_owner";

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
        <Typography color="text.primary">Module Configuration</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Box>
          <Typography variant="h4" component="h1">
            Module Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage module enablement for {organization.orgName}
          </Typography>
        </Box>
      </Box>

      {/* Module Configuration Content */}
      <OrgModuleConfigPage />
    </Box>
  );
}