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
} from "@mui/material";
import { Construction } from "@mui/icons-material";

export default function SystemChatConfigPage() {
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
