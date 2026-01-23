/**
 * System Chat Configuration Page (Placeholder)
 * 
 * Platform admin page for configuring system-wide chat settings.
 * TODO: Implement sys-level chat configuration (requires chat_cfg_sys table)
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
import { useUser } from "@{{PROJECT_NAME}}/module-access";

export default function SystemChatConfigPage() {
  const { profile, loading, isAuthenticated } = useUser();

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
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    profile.sysRole || ""
  );

  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        System Chat Configuration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure system-wide chat settings and defaults
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: "center", py: 8 }}>
          <Construction sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System chat configuration is under development.
          </Typography>
          <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: "auto" }}>
            This page will allow platform admins to configure system-wide chat defaults
            such as default models, message retention policies, and streaming settings.
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
