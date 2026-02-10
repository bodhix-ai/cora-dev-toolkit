"use client";

import { SysAccessAdmin } from "@{{PROJECT_NAME}}/module-access";

/**
 * System Access Admin Page
 *
 * Thin wrapper that renders the SysAccessAdmin component from module-access.
 * All auth, loading, and data logic is handled internally by the component.
 *
 * Route: /admin/sys/access
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @see 01_std_front_ADMIN-ARCH.md for admin page standards
 */
export default function SystemAccessAdminPage() {
  return <SysAccessAdmin />;
}