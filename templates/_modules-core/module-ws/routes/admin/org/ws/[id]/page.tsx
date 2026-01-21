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
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { WorkspaceDetailAdminPage } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspaceDetailAdminRoute() {
  const params = useParams();
  const { profile } = useUser();
  
  const workspaceId = params?.id as string;
  const currentOrgId = profile?.currentOrgId;

  // Check if user has org admin role for current org
  const isOrgAdmin = profile?.organizations?.some(
    (org) => org.orgId === currentOrgId && ["org_owner", "org_admin"].includes(org.role)
  );

  if (!workspaceId || !currentOrgId) {
    return null;
  }

  return (
    <WorkspaceDetailAdminPage
      workspaceId={workspaceId}
      orgId={currentOrgId}
      isOrgAdmin={isOrgAdmin ?? false}
    />
  );
}
