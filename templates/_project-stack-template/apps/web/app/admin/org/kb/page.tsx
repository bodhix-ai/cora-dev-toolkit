/**
 * Organization KB Configuration Page (Placeholder)
 * 
 * Org admin page for managing organization KB overrides.
 * TODO: Implement org-level KB configuration (requires kb_cfg_org table)
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

export default function OrgKBConfigPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Organization Knowledge Base Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage organization-level KB settings and overrides
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: "center", py: 8 }}>
          <Construction sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organization KB configuration is under development.
          </Typography>
          <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: "auto" }}>
            This page will allow org admins to override system-wide KB defaults
            such as chunk size, embedding models, and search parameters for their organization.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
