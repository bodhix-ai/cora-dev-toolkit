/**
 * OrgProvider Wrapper
 * 
 * Client component that creates the Okta auth adapter and wraps OrgProvider.
 * This bridges the server component (layout.tsx) with the client-side OrgProvider
 * which requires an auth adapter for API token management.
 * 
 * **Phase 1: Okta-Only Authentication (ADR-010)**
 * This component currently uses Okta as the sole authentication provider.
 * Future phases will migrate to AWS Cognito with federated external IDPs.
 * 
 * @see cora-dev-toolkit/docs/arch decisions/ADR-010-COGNITO-EXTERNAL-IDP-STRATEGY.md
 */

'use client';

import * as React from 'react';
import { OrgProvider, createOktaAuthAdapter } from '@{{PROJECT_NAME}}/module-access';

interface OrgProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * OrgProviderWrapper - Client component that initializes Okta auth adapter
 * 
 * This component:
 * 1. Creates the Okta auth adapter for NextAuth integration
 * 2. Passes the adapter to OrgProvider
 * 3. Renders children within the OrgProvider context
 * 
 * The adapter provides authentication tokens to OrgContext for API calls.
 * 
 * **Future Migration:**
 * Phase 2+ will replace this with AWS Cognito integration per ADR-010.
 */
export default function OrgProviderWrapper({ children }: OrgProviderWrapperProps) {
  // Create Okta auth adapter
  const authAdapter = React.useMemo(() => {
    console.log('[OrgProviderWrapper] Using Okta auth adapter');
    return createOktaAuthAdapter();
  }, []);

  return (
    <OrgProvider authAdapter={authAdapter}>
      {children}
    </OrgProvider>
  );
}
