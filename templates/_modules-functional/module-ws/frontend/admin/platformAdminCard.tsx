/**
 * System Admin Card - Workspace Configuration
 *
 * Admin card for System Admin dashboard.
 * Provides access to workspace module configuration including
 * navigation labels, feature flags, and defaults.
 */

import React from "react";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { Workspaces as WorkspacesIcon } from "@mui/icons-material";

/**
 * System Admin Card Configuration
 *
 * This card provides access to:
 * - Navigation label configuration (singular/plural)
 * - Navigation icon selection
 * - Feature toggles (favorites, tags, color coding)
 * - Default color settings
 * - Cross-organization usage statistics
 */
export const wsPlatformAdminCard: AdminCardConfig = {
  id: "ws-platform-config",
  title: "Workspace Configuration",
  description:
    "Configure workspace module behavior, navigation labels, and feature flags",
  icon: React.createElement(WorkspacesIcon),
  href: "/platform-admin/modules/workspace",
  context: "platform",
  color: "#1976d2", // Primary blue
  order: 100,
  requiredRoles: ["sys_owner", "sys_admin"],
};

export default wsPlatformAdminCard;
