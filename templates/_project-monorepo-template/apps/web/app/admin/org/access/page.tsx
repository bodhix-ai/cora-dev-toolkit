"use client";

import { OrgAccessAdmin } from "@{{PROJECT_NAME}}/module-access";

/**
 * Organization Access Admin Page
 *
 * Renders the OrgAccessAdmin component from module-access.
 *
 * This page follows the Component Delegation Pattern (01_std_front_ADMIN-ARCH.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/access
 */
export default function OrganizationAccessAdminPage() {
  return <OrgAccessAdmin />;
}