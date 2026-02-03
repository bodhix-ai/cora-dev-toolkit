"use client";

/**
 * Workspace Detail Page
 *
 * Route: /ws/[id]
 * Renders the workspace detail page from module-ws.
 * 
 * Note: This page uses the organization context from module-access
 * to automatically provide the orgId to WorkspaceDetailPage.
 * 
 * The WorkspacePluginProvider wraps the detail page to provide:
 * - Module availability checking (which modules are enabled at sys → org → ws levels)
 * - Workspace context for plugin modules
 */

import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext, useUser } from "@{{PROJECT_NAME}}/module-access";
import { WorkspaceDetailPage, useWorkspaceConfig } from "@{{PROJECT_NAME}}/module-ws";
import { WorkspacePluginProvider } from "@/components/WorkspacePluginProvider";

export default function WorkspaceDetailRoute() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();
  const { profile } = useUser();
  const workspaceId = params.id as string;
  const orgId = currentOrganization?.orgId || "";
  const userId = profile?.id || "";

  // Get workspace config for navigation labels
  const { navLabelSingular, navLabelPlural, navIcon } = useWorkspaceConfig({ orgId });

  // Note: apiClient is optional - WorkspaceDetailPage will create it internally
  // using useSession() within the component where SessionProvider context is available

  const handleBack = () => {
    router.push("/ws");
  };

  const handleDeleted = () => {
    router.push("/ws");
  };

  return (
    <WorkspacePluginProvider
      workspaceId={workspaceId}
      navigation={{
        labelSingular: navLabelSingular,
        labelPlural: navLabelPlural,
        icon: navIcon,
      }}
      features={{
        favoritesEnabled: true,
        tagsEnabled: true,
        colorCodingEnabled: true,
      }}
    >
      <WorkspaceDetailPage 
        workspaceId={workspaceId} 
        orgId={orgId}
        userId={userId}
        onBack={handleBack}
        onDeleted={handleDeleted}
      />
    </WorkspacePluginProvider>
  );
}
