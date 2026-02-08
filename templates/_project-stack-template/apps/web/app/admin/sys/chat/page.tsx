"use client";

import { SysChatAdmin } from "@{{PROJECT_NAME}}/module-chat/admin";

/**
 * System Chat Admin Page
 *
 * Thin wrapper that renders the SysChatAdmin component from module-chat.
 * All auth, loading, and data logic is handled internally by the component.
 *
 * Route: /admin/sys/chat
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @see 01_std_front_ADMIN-ARCH.md for admin page standards
 */
export default function SystemChatAdminPage() {
  return <SysChatAdmin />;
}