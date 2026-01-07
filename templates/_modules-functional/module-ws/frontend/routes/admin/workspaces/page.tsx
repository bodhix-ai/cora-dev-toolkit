"use client";

/**
 * Workspace Management Admin Page
 *
 * Route: /admin/workspaces
 * Renders the platform admin workspace configuration page from module-ws.
 * 
 * Access: Platform Owners and Platform Admins only
 * (enforced by the admin layout and the component itself)
 */

import { PlatformAdminConfigPage } from "@{{PROJECT_NAME}}/module-ws/admin";

export default function WorkspaceManagementPage() {
  return <PlatformAdminConfigPage />;
}
