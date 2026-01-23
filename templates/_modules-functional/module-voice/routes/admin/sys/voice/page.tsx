"use client";

import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { SysVoiceConfigPage } from "@{{PROJECT_NAME}}/module-voice";

/**
 * System Admin Voice Configuration Route
 * 
 * Allows sys admins to configure voice settings system-wide.
 * 
 * Auth: sys_admin or higher
 * Breadcrumbs: Sys Admin > Voice
 */
export default function SysVoiceRoute() {
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

  // Check for sys admin role
  const isSysAdmin = profile.role === "sys_admin" || profile.role === "super_admin";
  
  if (!isSysAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-muted-foreground">
            System administrator access required to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <SysVoiceConfigPage />;
}
