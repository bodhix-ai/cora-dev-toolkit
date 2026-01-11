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
 * Platform Admin Card - Workspace Configuration
 *
 * Platform-level configuration for the workspace module including:
 * - Navigation labels and icons
 * - Feature toggles
 * - Default settings
 */
export const workspacePlatformAdminCard: AdminCardConfig = {
  id: "workspace-configuration",
  title: "Workspace Configuration",
  description: "Configure workspace module behavior, navigation labels, and feature flags",
  icon: React.createElement(SettingsIcon),
  href: "/admin/platform/modules/workspace",
  context: "platform",
  color: "#1976d2", // Blue
  order: 40,
  requiredRoles: ["platform_owner", "platform_admin"],
};

/**
 * Organization Admin Card - Workspace Management
 *
 * Organization-level workspace management including:
 * - Workspace overview and analytics
 * - Workspace creation and deletion
 * - Member management
 */
export const workspaceOrgAdminCard: AdminCardConfig = {
  id: "workspace-management",
  title: "Workspace Management",
  description: "Manage organization workspaces, members, and analytics",
  icon: React.createElement(WorkspacesIcon),
  href: "/admin/workspaces",
  context: "organization",
  color: "#1976d2", // Blue
  order: 40,
  requiredRoles: ["platform_owner", "platform_admin", "org_owner", "org_admin"],
};
