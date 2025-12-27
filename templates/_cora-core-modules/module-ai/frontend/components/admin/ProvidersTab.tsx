"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { ProviderList } from "../providers/ProviderList";

interface ProvidersTabProps {
  authAdapter: CoraAuthAdapter;
}

export function ProvidersTab({ authAdapter }: ProvidersTabProps) {
  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage AI providers, test connections, and discover models. Add
        providers like OpenAI, Anthropic, or Azure OpenAI to enable AI
        capabilities across the platform.
      </Typography>
      <ProviderList authAdapter={authAdapter} />
    </Box>
  );
}
