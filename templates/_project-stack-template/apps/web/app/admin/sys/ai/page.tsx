"use client";

import { SysAiAdmin } from "@{{PROJECT_NAME}}/module-ai/admin";

/**
 * System AI Admin Page
 *
 * Thin wrapper that renders the SysAiAdmin component from module-ai.
 * All auth, loading, and data logic is handled internally by the component.
 *
 * Route: /admin/sys/ai
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @see 01_std_front_ADMIN-ARCH.md for admin page standards
 */
export default function SystemAIAdminPage() {
  return <SysAiAdmin />;
}