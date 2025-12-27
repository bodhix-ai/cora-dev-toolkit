"use client";

import { useSession } from "next-auth/react";
import { AccessControlAdmin } from "@{{PROJECT_NAME}}/module-access";
import { createAuthenticatedApiClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Access Control Admin Page
 * 
 * Platform admin interface for managing:
 * - Organizations
 * - Users
 * - Identity Provider Configuration
 * 
 * Only accessible to platform_owner and platform_admin roles.
 */
export default function AccessControlPage() {
  const { data: session } = useSession();

  // Create authenticated API client
  const authAdapter = createAuthenticatedApiClient(session);

  return <AccessControlAdmin authAdapter={authAdapter} />;
}
