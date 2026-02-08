"use client";

/**
 * System Workspace Admin Page
 *
 * Platform-level workspace management page for system configuration
 * and cross-organization analytics.
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
 * - Platform-level workspace configuration
 * - Cross-organization workspace analytics
 * - System workspace settings
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemWsAdminPage() {
  return <SysWsAdmin />;
}