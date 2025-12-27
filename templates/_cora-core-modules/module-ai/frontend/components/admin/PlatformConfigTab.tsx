"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { PlatformAIConfigPanel } from "../PlatformAIConfigPanel";

interface PlatformConfigTabProps {
  authAdapter: CoraAuthAdapter;
}

export function PlatformConfigTab({ authAdapter }: PlatformConfigTabProps) {
  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure platform-wide AI settings, including default chat and
        embedding models, and the global system prompt that guides AI behavior
        across all applications.
      </Typography>
      <PlatformAIConfigPanel authAdapter={authAdapter} />
    </Box>
  );
}
