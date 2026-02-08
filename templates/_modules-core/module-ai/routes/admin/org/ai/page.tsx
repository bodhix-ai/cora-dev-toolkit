"use client";

/**
 * Organization AI Admin Page
 *
 * Organization-level AI configuration page for AI settings and prompts.
 *
 * Access: Organization admins only (org_owner, org_admin)
 *
 * @example
 * Route: /admin/org/ai
 */

import React from "react";
import { OrgAiAdmin } from "@{{PROJECT_NAME}}/module-ai/admin";

/**
 * Organization AI Admin Page Component
 *
 * Renders the Organization AI admin interface for:
 * - Organization-specific AI configuration
 * - AI system prompts
 * - AI settings and preferences
 *
 * Requires organization admin role (org_owner or org_admin).
 */
export default function OrganizationAiAdminPage() {
  return <OrgAiAdmin />;
}