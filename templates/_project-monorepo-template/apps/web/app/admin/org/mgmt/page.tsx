"use client";

/**
 * Organization Management Admin Page
 *
 * This page follows the standard admin component pattern (01_std_front_ADMIN-ARCH.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/mgmt
 */

import React from "react";
import { OrgMgmtAdmin } from "@{{PROJECT_NAME}}/module-mgmt";

export default function OrgManagementPage() {
  return <OrgMgmtAdmin />;
}