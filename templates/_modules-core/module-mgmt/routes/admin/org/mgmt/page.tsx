"use client";

/**
 * Organization Management Admin Page
 *
 * Organization-level platform management page for module configuration.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/mgmt
 */

import React from "react";
import { OrgMgmtAdmin } from "@{{PROJECT_NAME}}/module-mgmt/admin";

/**
 * Organization Management Admin Page Component
 *
 * Renders the Organization Management admin interface for:
 * - Module configuration for the organization
 * - Organization-level management settings
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationMgmtAdminPage() {
  return <OrgMgmtAdmin />;
}