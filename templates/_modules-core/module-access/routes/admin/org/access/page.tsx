"use client";

import { useUser, useOrganizationContext, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgAccessPage } from "@{{PROJECT_NAME}}/module-access";
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
  People as PeopleIcon,
} from "@mui/icons-material";
import NextLink from "next/link";

/**
 * Organization Admin Access Management Route
 * 
 * Allows org admins and owners to manage users in their organization.
 * 
 * Auth: org_admin or org_owner
 * Breadcrumbs: Org Admin > Access
 */
export default function OrgAccessRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin, isSysAdmin, role } = useRole();

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

  // Authorization check - org admins OR sys admins can access (ADR-016)
  if (!isOrgAdmin && !isSysAdmin) {
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
          Please select an organization to manage access.
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
        >
          Org Admin
        </Link>
        <Typography color="text.primary">Member Management</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <PeopleIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Box>
          <Typography variant="h4" component="h1">
            Member Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage members and roles for {organization.name}
          </Typography>
        </Box>
      </Box>

      {/* Access Management Content */}
      <Paper sx={{ p: 3 }}>
        <OrgAccessPage orgId={organization.orgId} isOwner={isOwner} />
      </Paper>
    </Box>
  );
}
