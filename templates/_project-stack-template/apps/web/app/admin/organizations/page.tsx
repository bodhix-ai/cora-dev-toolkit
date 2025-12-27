"use client";

import React from "react";
import { OrganizationManagement } from "@{{PROJECT_NAME}}/module-access";
import { createAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import { useSession } from "next-auth/react";

/**
 * Organization Management Admin Page
 * 
 * Platform admin interface for managing organizations.
 * Accessible only to platform_owner and platform_admin roles.
 * 
 * Features:
 * - List all organizations with member counts
 * - Create new organizations
 * - Edit organization details and domain configuration
 * - Configure domain-based auto-provisioning
 * - Delete organizations
 */
export default function OrganizationsAdminPage() {
  const { data: session } = useSession();
  
  // Create authenticated API client
  const apiClient = session?.accessToken 
    ? createAuthenticatedClient(session.accessToken)
    : null;
  
  if (!apiClient) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  return <OrganizationManagement apiClient={apiClient} />;
}
