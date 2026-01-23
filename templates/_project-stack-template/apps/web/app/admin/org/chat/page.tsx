/**
 * Organization Chat Configuration Page (Placeholder)
 * 
 * Org admin page for managing organization chat settings.
 * TODO: Implement org-level chat configuration (requires chat_cfg_org table)
 */

"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Construction } from "@mui/icons-material";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";

export default function OrgChatConfigPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { isOrgAdmin, isSysAdmin } = useRole();

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

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Organization Chat Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage organization-level chat settings and preferences
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: "center", py: 8 }}>
          <Construction sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organization chat configuration is under development.
          </Typography>
          <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: "auto" }}>
            This page will allow org admins to override system-wide chat defaults
            such as default models, message retention, and sharing policies for their organization.
            <br /><br />
            <strong>Note:</strong> Chat-related features like citation styles are currently
            managed in the Access Control admin section under organization settings
            (ai_cfg_org_prompts table).
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
