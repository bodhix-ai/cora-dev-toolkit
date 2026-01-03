"use client";

import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
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
  const [apiClient, setApiClient] = useState<ReturnType<typeof createCoraAuthenticatedClient> | null>(null);

  useEffect(() => {
    const initClient = async () => {
      const token = await authAdapter.getToken();
      if (token) {
        setApiClient(createCoraAuthenticatedClient(token));
      }
    };
    initClient();
  }, [authAdapter]);

  if (!apiClient) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Identity Provider Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure authentication providers for your platform. Only one provider can be active at a time.
      </Typography>
      
      <IdpConfigCard apiClient={apiClient} />
    </Box>
  );
}
