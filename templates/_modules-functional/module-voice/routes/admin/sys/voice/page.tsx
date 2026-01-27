"use client";

import { Box, Typography, CircularProgress } from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { SysVoiceConfigPage } from "@{{PROJECT_NAME}}/module-voice";

/**
 * System Admin Voice Configuration Route
 * 
 * Allows sys admins to configure voice settings system-wide.
 * 
 * Auth: sys_admin or higher
 * Breadcrumbs: Sys Admin > Voice
 */
export default function SysVoiceRoute() {
  const { profile, loading, isAuthenticated } = useUser();

  // Pattern A: Auth checks
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please sign in to access this page.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Check for sys admin role
  const isSysAdmin = profile.role === "sys_admin" || profile.role === "super_admin";
  
  if (!isSysAdmin) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System administrator access required to view this page.
          </Typography>
        </Box>
      </Box>
    );
  }

  return <SysVoiceConfigPage />;
}
