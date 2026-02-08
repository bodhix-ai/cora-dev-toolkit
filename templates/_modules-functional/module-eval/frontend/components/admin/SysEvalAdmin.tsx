/**
 * SysEvalAdmin - System Evaluation Admin Component
 *
 * @routes
 * - /admin/sys/eval - System evaluation configuration
 *
 * Admin component with tabs for all sys eval admin functions:
 * - Configuration (eval_cfg_sys)
 * - AI Prompts (eval_cfg_sys_prompts)
 *
 * Access: Platform admins only (sys_owner, sys_admin)
 */

"use client";

import React, { useState } from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { SysEvalConfigPage, SysEvalPromptsPage } from "../../pages";
import { Box, Tabs, Tab, CircularProgress, Alert, Breadcrumbs, Link, Typography } from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";

type TabValue = "config" | "prompts";

export function SysEvalAdmin() {
  const { profile, loading, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();
  const [activeTab, setActiveTab] = useState<TabValue>("config");

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
        <Alert severity="error">You must be logged in to access this page.</Alert>
      </Box>
    );
  }

  // Authorization check (sys admin only) - ADR-019a pattern
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">Access denied. System administrator role required.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/admin/sys" sx={{ display: "flex", alignItems: "center" }} aria-label="Navigate to Sys Admin">
          Sys Admin
        </Link>
        <Typography color="text.primary">Eval</Typography>
      </Breadcrumbs>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} aria-label="System evaluation admin tabs">
          <Tab label="Configuration" value="config" />
          <Tab label="AI Prompts" value="prompts" />
        </Tabs>
      </Box>

      <Box sx={{ pt: 3 }}>
        {activeTab === "config" && <SysEvalConfigPage />}
        {activeTab === "prompts" && <SysEvalPromptsPage />}
      </Box>
    </Box>
  );
}

export default SysEvalAdmin;