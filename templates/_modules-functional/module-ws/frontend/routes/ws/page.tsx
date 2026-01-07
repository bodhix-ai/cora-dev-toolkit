"use client";

/**
 * Workspaces Page
 *
 * Route: /ws
 * Renders the workspace list page from module-ws.
 * 
 * Note: This page uses the organization context from module-access
 * to automatically provide the orgId to WorkspaceListPage.
 */

import { WorkspaceListPage } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspacesPage() {
  return <WorkspaceListPage />;
}
