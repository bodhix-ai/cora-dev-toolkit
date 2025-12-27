import React from "react";
import BusinessIcon from "@mui/icons-material/Business";
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
  href: "/admin/access",
  context: "platform",
  color: "primary.main",
  order: 10, // Core platform feature - should appear first
  requiredRoles: ["platform_owner", "platform_admin"],
};
