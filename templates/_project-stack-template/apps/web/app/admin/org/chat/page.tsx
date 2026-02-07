"use client";

import { OrgChatAdmin } from "@ai-mod/module-chat";

/**
 * Organization Chat Admin Page
 *
 * Thin wrapper that renders the OrgChatAdmin component from module-chat.
 * All auth, loading, and data logic is handled internally by the component.
 *
 * Route: /admin/org/chat
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @see 01_std_front_ADMIN-ARCH.md for admin page standards
 */
export default function OrganizationChatAdminPage() {
  return <OrgChatAdmin />;
}