"use client";

import { useSession } from "next-auth/react";
import { AccessControlAdmin, createOktaAuthAdapter } from "@{{PROJECT_NAME}}/module-access";

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

  // Create Okta auth adapter
  // Session is guaranteed to exist here because route is protected by middleware
  const authAdapter = createOktaAuthAdapter();

  return <AccessControlAdmin authAdapter={authAdapter} />;
}
