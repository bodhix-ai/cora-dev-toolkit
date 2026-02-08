"use client";

/**
 * System Workspace Admin Page
 *
 * System-level workspace management page for platform configuration
 * and analytics.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/ws
 */

import React from "react";
import { SysWsAdmin } from "@{{PROJECT_NAME}}/module-ws/admin";

/**
 * System Workspace Admin Page Component
 *
 * Renders the System Workspace admin interface for:
 * - Platform workspace configuration
 * - System-wide workspace analytics
 * - Workspace management across all organizations
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemWsAdminPage() {
  return <SysWsAdmin />;
}
