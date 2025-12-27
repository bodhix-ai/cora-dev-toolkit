"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { IdpConfigCard } from "./IdpConfigCard";

interface IdpTabProps {
  authAdapter: CoraAuthAdapter;
}

/**
 * IDP Configuration Tab Component
 * 
 * Wraps the IdpConfigCard component for the Access Control admin page.
 * Allows platform admins to configure identity providers.
 */
export function IdpTab({ authAdapter }: IdpTabProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Identity Provider Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure authentication providers for your platform. Only one provider can be active at a time.
      </Typography>
      
      <IdpConfigCard apiClient={authAdapter} />
    </Box>
  );
}
