"use client";

/**
 * System Admin - Workspace Configuration Page
 * 
 * Route: /admin/sys/ws
 * 
 * This is a thin wrapper that renders the PlatformAdminConfigPage component.
 * All logic and UI is in the component - this file just defines the route.
 * 
 * Features:
 * - Configuration: Navigation labels, visual icon picker, color picker, feature flags
 * - Usage Summary: Real API calls to /ws/sys/analytics for cross-org statistics
 * 
 * Access: Platform admins only (platform_owner, platform_admin)
 */

import { PlatformAdminConfigPage } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspaceSystemConfigPage() {
  return <PlatformAdminConfigPage />;
}
