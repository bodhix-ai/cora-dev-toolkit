import { UserOrganization, User } from "../types";

/**
 * Check if user can manage organization members
 */
export function canManageMembers(
  orgOrRole: UserOrganization | string,
): boolean {
  const role = typeof orgOrRole === "string" ? orgOrRole : orgOrRole.role;
  return role === "org_owner";
}

/**
 * Check if user can manage organization settings
 */
export function canManageSettings(org: UserOrganization): boolean {
  return org.role === "org_admin" || org.role === "org_owner";
}

/**
 * Check if user is organization owner
 */
export function isOrgOwner(org: UserOrganization): boolean {
  return org.role === "org_owner";
}

/**
 * Check if user is organization admin
 */
export function isOrgAdmin(org: UserOrganization): boolean {
  return org.role === "org_admin";
}

/**
 * Check if user has org admin or owner access
 */
export function hasOrgAdminAccess(org: UserOrganization): boolean {
  return org.role === "org_admin" || org.role === "org_owner";
}

/**
 * Check if user is global admin
 */
export function isGlobalAdmin(user: User): boolean {
  return (
    user.globalRole === "global_admin" || user.globalRole === "global_owner"
  );
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(
  role:
    | "org_user"
    | "org_admin"
    | "org_owner"
    | "global_user"
    | "global_admin"
    | "global_owner",
): string {
  const roleNames = {
    org_user: "Member",
    org_admin: "Admin",
    org_owner: "Owner",
    global_user: "User",
    global_admin: "Global Admin",
    global_owner: "Global Owner",
  };
  return roleNames[role] || role;
}
