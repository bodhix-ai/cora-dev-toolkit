"use client";

import { SysOrgDetailsAdmin } from "@{{PROJECT_NAME}}/module-access";

/**
 * System Admin - Organization Details Page
 *
 * Renders the SysOrgDetailsAdmin component from module-access.
 *
 * This page follows the Component Delegation Pattern (01_std_front_ADMIN-ARCH.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/access/orgs/[id]
 */
export default function SysOrgDetailsPage({ params }: { params: { id: string } }) {
  return <SysOrgDetailsAdmin orgId={params.id} />;
}