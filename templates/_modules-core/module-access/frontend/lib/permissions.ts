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
 * Check if user is system admin (sys_admin or sys_owner)
 */
export function isSysAdmin(user: User): boolean {
  return (
    user.sysRole === "sys_admin" || user.sysRole === "sys_owner"
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
    | "sys_user"
    | "sys_admin"
    | "sys_owner",
): string {
  const roleNames: Record<string, string> = {
    org_user: "Member",
    org_admin: "Admin",
    org_owner: "Owner",
    sys_user: "User",
    sys_admin: "System Admin",
    sys_owner: "System Owner",
  };
  return roleNames[role] || role;
}
