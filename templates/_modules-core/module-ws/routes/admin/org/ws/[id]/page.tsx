import { OrgWsDetailAdminComponent } from "./OrgWsDetailAdminComponent";

/**
 * Workspace Detail Admin Route
 * 
 * Thin wrapper that delegates to OrgWsDetailAdminComponent.
 * Organization admin route for detailed workspace management.
 * 
 * Route: /admin/org/ws/[id]
 * Required Roles: org_admin, org_owner
 * 
 * @see OrgWsDetailAdminComponent for implementation details
 */
export default function WorkspaceDetailAdminRoute() {
  return <OrgWsDetailAdminComponent />;
}
