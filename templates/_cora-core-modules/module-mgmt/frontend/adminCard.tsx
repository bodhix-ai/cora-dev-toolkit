/**
 * Platform Management Admin Card
 *
 * Admin card for Platform Management module.
 * Displays on the platform admin dashboard.
 */

import React from "react";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { Settings as SettingsIcon } from "@mui/icons-material";

/**
 * Platform Management Admin Card Configuration
 *
 * This card provides access to:
 * - Lambda warming schedule management
 * - Platform performance monitoring (future)
 * - Storage management (future)
 * - Cost tracking (future)
 */
export const platformMgmtAdminCard: AdminCardConfig = {
  id: "platform-management",
  title: "Platform Management",
  description:
    "Manage Lambda functions, performance, storage, and platform operations",
  icon: React.createElement(SettingsIcon),
  href: "/admin/mgmt",
  context: "platform",
  color: "#9333ea", // Purple
  order: 30,
  requiredRoles: ["platform_owner", "platform_admin"],
};

export default platformMgmtAdminCard;
