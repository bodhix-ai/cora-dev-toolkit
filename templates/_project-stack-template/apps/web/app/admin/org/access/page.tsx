"use client";

import { OrgAccessAdmin } from "@{{PROJECT_NAME}}/module-access/admin";

/**
 * Organization Access Admin Page
 * Renders the OrgAccessAdmin component from module-access.
 * 
 * This page follows the standard admin component pattern (01_std_front_ADMIN-COMPONENTS.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 */
export default function OrgAccessAdminPage() {
  return <OrgAccessAdmin />;
}