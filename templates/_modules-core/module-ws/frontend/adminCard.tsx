/**
 * Workspace Management Admin Cards
 *
 * Admin cards for Workspace Management module.
 * Provides both platform-level and organization-level admin cards.
 */

import React from "react";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { Settings as SettingsIcon, Workspaces as WorkspacesIcon } from "@mui/icons-material";

/**
 * System Admin Card - Workspace Configuration
 *
 * System-level configuration for the workspace module including:
 * - Navigation labels and icons
 * - Feature toggles (platform-wide defaults)
 * - Default settings
 * 
 * Route: /admin/sys/ws
 */
export const workspacePlatformAdminCard: AdminCardConfig = {
  id: "workspace-configuration",
  title: "Workspace Configuration",
  description: "Configure platform-wide workspace module defaults, navigation labels, and feature flags",
  icon: React.createElement(SettingsIcon),
  href: "/admin/sys/ws",
  context: "platform",
  color: "#1976d2", // Blue
  order: 40,
  requiredRoles: ["sys_owner", "sys_admin"],
};

/**
 * Organization Admin Card - Workspace Management
 *
 * Organization-level workspace management including:
 * - Workspace overview and analytics for current org
 * - Workspace archiving and soft-deletion
 * - Member management
 * 
 * Route: /admin/org/ws
 */
export const workspaceOrgAdminCard: AdminCardConfig = {
  id: "workspace-management",
  title: "Workspace Management",
  description: "Manage organization workspaces, members, and analytics",
  icon: React.createElement(WorkspacesIcon),
  href: "/admin/org/ws",
  context: "organization",
  color: "#1976d2", // Blue
  order: 40,
  requiredRoles: ["sys_owner", "sys_admin", "org_owner", "org_admin"],
};
