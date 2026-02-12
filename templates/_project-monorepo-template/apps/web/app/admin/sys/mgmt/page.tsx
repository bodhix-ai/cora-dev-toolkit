"use client";

/**
 * System Management Admin Page
 *
 * System-level management page for module configuration, Lambda warming,
 * performance monitoring, storage management, and cost tracking.
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * Note: "Platform" terminology deprecated - use "System" (sys) instead.
 *
 * @example
 * Route: /admin/sys/mgmt
 */

"use client";

import React from "react";
import { SysMgmtAdmin } from "@{{PROJECT_NAME}}/module-mgmt/admin";

/**
 * System Management Admin Page
 *
 * This page follows the standard admin component pattern (01_std_front_ADMIN-ARCH.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 *
 * Integrated functionality:
 * - Module configuration (formerly at /admin/sys/mgmt/modules)
 * - Lambda warming schedule management
 * - Performance monitoring (planned)
 * - Storage management (planned)
 * - Cost tracking (planned)
 *
 * Requires system admin role (sys_owner or sys_admin).
 */
export default function SystemManagementPage() {
  return <SysMgmtAdmin />;
}
