import React from "react";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

/**
 * Access Control Admin Card
 * 
 * Provides platform administrators comprehensive access control management
 * including organizations, users, identity providers, and access settings.
 */
export const accessControlAdminCard: AdminCardConfig = {
  id: "access-control",
  title: "Access Control",
  description: "Manage organizations, users, identity providers, and access settings",
  icon: <BusinessIcon sx={{ fontSize: 48 }} />,
  href: "/admin/sys/access",
  context: "platform",
  color: "primary.main",
  order: 10, // Core platform feature - should appear first
  requiredRoles: ["sys_owner", "sys_admin"],
};

/**
 * Organization Settings Admin Card
 * 
 * Provides organization administrators access to organization-level settings
 * including organization details, members, and invitations.
 */
export const organizationSettingsCard: AdminCardConfig = {
  id: "org-settings",
  title: "Organization Settings",
  description: "Configure your organization details and manage members",
  icon: <SettingsIcon sx={{ fontSize: 48 }} />,
  href: "/org/settings",
  context: "organization",
  color: "primary.main",
  order: 10,
  requiredRoles: ["sys_owner", "sys_admin", "org_owner", "org_admin"],
};
