"use client";

import { OrgKbAdmin } from "@{{PROJECT_NAME}}/module-kb";

/**
 * Organization KB Admin Page
 *
 * Thin wrapper that renders the OrgKbAdmin component from module-kb.
 * All auth, loading, and data logic is handled internally by the component.
 *
 * Route: /admin/org/kb
 * Access: Organization admins only (org_admin, org_owner)
 *
 * @see 01_std_front_ADMIN-ARCH.md for admin page standards
 */
export default function OrgKBAdminPage() {
  return <OrgKbAdmin />;
}