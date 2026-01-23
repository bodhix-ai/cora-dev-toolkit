"use client";

import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { OrgAccessPage } from "@{{PROJECT_NAME}}/module-access";

/**
 * Organization Admin Access Management Route
 * 
 * Allows org admins and owners to manage users in their organization.
 * 
 * Auth: org_admin or org_owner
 * Breadcrumbs: Org Admin > Access
 */
export default function OrgAccessRoute() {
  const { profile, loading, isAuthenticated } = useUser();

  // Pattern A: Auth checks
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Authentication Required</p>
          <p className="text-muted-foreground">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check for org admin or org owner role
  const isOrgAdmin = profile.orgRole === "org_admin" || profile.orgRole === "org_owner";
  
  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-muted-foreground">
            Organization administrator access required to view this page.
          </p>
        </div>
      </div>
    );
  }

  const isOwner = profile.orgRole === "org_owner";

  return <OrgAccessPage orgId={profile.orgId} isOwner={isOwner} />;
}
