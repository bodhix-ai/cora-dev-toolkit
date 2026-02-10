"use client";

import { SysKbAdmin } from "@{{PROJECT_NAME}}/module-kb";

/**
 * System KB Admin Page
 *
 * Thin wrapper that renders the SysKbAdmin component from module-kb.
 * All auth, loading, and data logic is handled internally by the component.
 *
 * Route: /admin/sys/kb
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @see 01_std_front_ADMIN-ARCH.md for admin page standards
 */
export default function SystemKBAdminPage() {
  return <SysKbAdmin />;
}