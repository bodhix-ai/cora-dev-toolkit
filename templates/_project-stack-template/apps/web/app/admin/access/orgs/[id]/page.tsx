"use client";

import { useSession } from "next-auth/react";
import { OrgDetails } from "@{{PROJECT_NAME}}/module-access";
import { createAuthenticatedApiClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Organization Details Page
 * 
 * Displays detailed information about a specific organization with tabs for:
 * - Overview: Basic organization information
 * - Domains: Email domain management
 * - Members: Organization membership
 * - Invites: Pending invitations
 * - AI Config: AI configuration (platform admins only)
 * 
 * Accessible to:
 * - Platform admins (all tabs)
 * - Org owners/admins (Overview, Domains, Members, Invites only)
 */
export default function OrgDetailsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();

  // Create authenticated API client
  const authAdapter = createAuthenticatedApiClient(session);

  // Determine if user is platform admin
  const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
    session?.user?.global_role || ""
  );

  return (
    <OrgDetails
      orgId={params.id}
      authAdapter={authAdapter}
      isPlatformAdmin={isPlatformAdmin}
    />
  );
}
