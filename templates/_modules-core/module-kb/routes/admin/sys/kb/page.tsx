"use client";

/**
 * System KB Admin Page
 *
 * Platform-level knowledge base management page for system KB configuration
 * and cross-organization management.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/kb
 */

import React from "react";
import { SysKbAdmin } from "@{{PROJECT_NAME}}/module-kb/admin";

/**
 * System KB Admin Page Component
 *
 * Renders the System KB admin interface for:
 * - Platform-level knowledge base management
 * - Organization association management
 * - System KB configuration and analytics
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemKbAdminPage() {
  return <SysKbAdmin />;
}