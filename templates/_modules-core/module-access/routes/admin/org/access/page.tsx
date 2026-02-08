"use client";

/**
 * Organization Access Admin Page
 *
 * Organization-level access management page for member and role management.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/access
 */

import React from "react";
import { OrgAccessAdmin } from "@{{PROJECT_NAME}}/module-access/admin";

/**
 * Organization Access Admin Page Component
 *
 * Renders the Organization Access admin interface for:
 * - Member management for the organization
 * - Role assignment and permissions
 * - Invitation management
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationAccessAdminPage() {
  return <OrgAccessAdmin />;
}