"use client";

/**
 * Organization KB Admin Page
 *
 * Organization-level knowledge base management page for KB configuration
 * and document management.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/kb
 */

import React from "react";
import { OrgKbAdmin } from "@{{PROJECT_NAME}}/module-kb/admin";

/**
 * Organization KB Admin Page Component
 *
 * Renders the Organization KB admin interface for:
 * - Knowledge base creation and configuration
 * - Document upload and management
 * - KB analytics for the organization
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationKbAdminPage() {
  return <OrgKbAdmin />;
}