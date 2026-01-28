"use client";

/**
 * Organization Management Admin Page
 *
 * Organization-level management page for viewing module status and usage.
 *
 * Access: Organization admins only (org_admin)
 *
 * @example
 * Route: /admin/org/mgmt
 */

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert, Typography, Paper } from "@mui/material";
import { useModuleRegistry } from "@{{PROJECT_NAME}}/module-mgmt";

/**
 * Organization Management Admin Page Component
 *
 * Renders the Organization Management admin interface with:
 * - Module status (read-only view)
 * - Module usage statistics for the organization
 *
 * Requires organization admin role (org_admin).
 */
export default function OrganizationManagementPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { modules, loading: modulesLoading } = useModuleRegistry();

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
  const isOrgAdmin = profile.orgRole === "org_admin";

  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Organization Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View module status and usage for your organization
      </Typography>

      {modulesLoading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Enabled Modules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The following modules are currently enabled for your organization:
          </Typography>
          <Box component="ul" sx={{ mt: 2 }}>
            {modules
              ?.filter((m) => m.isEnabled)
              .map((module) => (
                <Box component="li" key={module.name} sx={{ mb: 1 }}>
                  <Typography variant="body1">
                    <strong>{module.displayName}</strong> ({module.name})
                  </Typography>
                  {module.description && (
                    <Typography variant="body2" color="text.secondary">
                      {module.description}
                    </Typography>
                  )}
                </Box>
              ))}
          </Box>
          
          <Alert severity="info" sx={{ mt: 3 }}>
            For full management capabilities, please contact your system administrator.
          </Alert>
        </Paper>
      )}
    </Box>
  );
}