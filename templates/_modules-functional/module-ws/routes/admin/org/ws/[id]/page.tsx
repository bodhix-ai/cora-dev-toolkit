/**
 * Workspace Detail Admin Route
 * 
 * Organization admin route for detailed workspace management.
 * Provides comprehensive workspace administration capabilities.
 * 
 * Route: /admin/org/ws/[id]
 * Required Roles: org_admin, org_owner
 */

"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { WorkspaceDetailAdminPage } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspaceDetailAdminRoute() {
  const params = useParams();
  const { data: session } = useSession();
  
  const workspaceId = params?.id as string;
  const orgId = session?.user?.orgId as string;

  if (!workspaceId || !orgId) {
    return null;
  }

  return (
    <WorkspaceDetailAdminPage
      workspaceId={workspaceId}
      orgId={orgId}
      isOrgAdmin={
        session?.user?.role === "org_admin" || 
        session?.user?.role === "org_owner"
      }
    />
  );
}
