/**
 * @component SysVoiceAdmin
 * @description System Voice Admin Component
 * 
 * Thin admin wrapper that handles auth/loading and renders SysVoiceConfigPage.
 * 
 * @routes
 * - GET /admin/sys/voice - System voice configuration
 */

"use client";

import React from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { SysVoiceConfigPage } from "../../pages";
import { Box, CircularProgress, Alert } from "@mui/material";

export function SysVoiceAdmin() {
  const { loading, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();

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

  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. System admin role required.</Alert>
      </Box>
    );
  }

  return <SysVoiceConfigPage />;
}

export default SysVoiceAdmin;