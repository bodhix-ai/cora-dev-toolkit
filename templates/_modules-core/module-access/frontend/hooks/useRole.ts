"use client";

import { useContext } from "react";
import { UserContext } from "../contexts/UserContext";
import { OrgContext } from "../contexts/OrgContext";
import { hasOrgAdminAccess, isSysAdmin } from "../lib/permissions";

/**
 * Compatibility hook for role-based access control
 * Provides backward-compatible API for existing components
 */
export function useRole() {
  const userContext = useContext(UserContext);
  const orgContext = useContext(OrgContext);

  if (!userContext || !orgContext) {
    throw new Error("useRole must be used within UserProvider and OrgProvider");
  }

  const { profile } = userContext;
  const { currentOrg } = orgContext;

  // Get current role from current organization
  const role = currentOrg?.role || null;

  // Permission check function
  const hasPermission = (requiredRole: string): boolean => {
    if (!profile || !currentOrg) return false;

    // Check system admin
    if (isSysAdmin(profile)) return true;

    // Check org-level permissions
    if (requiredRole === "administrator") {
      return hasOrgAdminAccess(currentOrg);
    }

    // Add other role checks as needed
    return false;
  };

  return {
    role,
    hasPermission,
    isSysAdmin: profile ? isSysAdmin(profile) : false,
    isOrgAdmin: currentOrg ? hasOrgAdminAccess(currentOrg) : false,
  };
}
