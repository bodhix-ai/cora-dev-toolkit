"use client";

import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { OrgDetails } from "@{{PROJECT_NAME}}/module-access";

/**
 * Organization Details Page
 * 
 * Displays detailed information about a specific organization with tabs for:
 * - Overview: Basic organization information
 * - Domains: Email domain management
 * - Members: Organization membership
 * - Invites: Pending invitations
 * - AI Config: AI configuration (system admins only)
 * 
 * Accessible to:
 * - System admins (all tabs)
 * - Org owners/admins (Overview, Domains, Members, Invites only)
 */
export default function OrgDetailsPage({ params }: { params: { id: string } }) {
  const { profile, authAdapter } = useUser();

  // Determine if user is system admin
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    profile?.sysRole || ""
  );

  return (
    <OrgDetails
      orgId={params.id}
      authAdapter={authAdapter}
      isPlatformAdmin={isSysAdmin}
    />
  );
}
