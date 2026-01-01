/**
 * Organization Admin Card - Workspace Management
 *
 * Admin card for Organization Admin dashboard.
 * Provides access to workspace management, analytics, and bulk operations.
 */

import React from "react";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { Workspaces as WorkspacesIcon } from "@mui/icons-material";
import { createWorkspaceApiClient } from "../lib/api";

/**
 * Organization Admin Card Configuration
 *
 * This card provides access to:
 * - View all organization workspaces
 * - Workspace analytics and statistics
 * - Bulk operations (archive, restore, delete)
 * - Member management
 */
export const wsOrgAdminCard: AdminCardConfig = {
  id: "ws-org-management",
  title: "Workspace Management",
  description:
    "View and manage all organization workspaces, members, and analytics",
  icon: React.createElement(WorkspacesIcon),
  href: "/org-admin/workspaces",
  context: "organization",
  color: "#1976d2", // Primary blue
  order: 200,
  requiredRoles: ["org_owner", "org_admin"],
  /**
   * Fetch dynamic stats for the admin card
   * Shows total and active workspace counts
   */
  stats: async (orgId: string, token: string) => {
    try {
      const client = createWorkspaceApiClient(token);
      const stats = await client.getStats(orgId);
      return `${stats.total} workspaces • ${stats.active} active`;
    } catch (error) {
      console.error("Failed to fetch workspace stats:", error);
      return null;
    }
  },
};

export default wsOrgAdminCard;
