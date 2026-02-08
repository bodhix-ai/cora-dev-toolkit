"use client";

/**
 * Workspaces Page - Eval Optimizer
 *
 * Route: /ws
 * Renders the workspace list page from module-ws.
 * 
 * Note: This page uses the organization context from module-access
 * to automatically provide the orgId to WorkspaceListPage.
 * 
 * The workspace creation modal (triggered by "+ New Workspace" button)
 * handles creating simple workspaces with name/description.
 * Doc type and criteria set configuration happens AFTER workspace creation
 * on the workspace detail page.
 */

import { useRouter } from "next/navigation";
import { WorkspaceListPage } from "@{{PROJECT_NAME}}/module-ws";
import type { Workspace } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspacesPage() {
  const router = useRouter();

  const handleWorkspaceClick = (workspace: Workspace) => {
    router.push(`/ws/${workspace.id}`);
  };

  return <WorkspaceListPage onWorkspaceClick={handleWorkspaceClick} />;
}