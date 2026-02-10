/**
 * @component OrgVoiceAdmin
 * @description Organization Voice Admin Component
 * 
 * Thin admin wrapper that handles auth/loading and renders OrgVoiceConfigPage.
 * 
 * @routes
 * - GET /admin/org/voice - Organization voice configuration
 */

"use client";

import React from "react";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { OrgVoiceConfigPage } from "../../pages";
import { Box, CircularProgress, Alert } from "@mui/material";

export function OrgVoiceAdmin() {
  const { loading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You must be logged in to access this page.</Alert>
      </Box>
    );
  }

  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Organization admin role required.</Alert>
      </Box>
    );
  }

  if (!currentOrganization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please select an organization to manage voice configuration.</Alert>
      </Box>
    );
  }

  return <OrgVoiceConfigPage orgId={currentOrganization.orgId} />;
}

export default OrgVoiceAdmin;