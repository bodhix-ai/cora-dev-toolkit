"use client";

/**
 * Organization Workspace Admin Page
 *
 * Organization-level workspace management page for org configuration
 * and analytics.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/ws
 */

import React from "react";
import { OrgWsAdmin } from "@{{PROJECT_NAME}}/module-ws";

/**
 * Organization Workspace Admin Page Component
 *
 * Renders the Organization Workspace admin interface for:
 * - Organization workspace configuration
 * - Workspace management for the organization
 * - Organization workspace analytics
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationWsAdminPage() {
  return <OrgWsAdmin />;
}
