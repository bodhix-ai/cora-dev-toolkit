/**
 * OrgProvider Wrapper for Eval Optimizer
 * 
 * Client component that creates the Okta auth adapter and wraps OrgProvider.
 * This provides organization context to the eval-opt companion app.
 * 
 * @see cora-dev-toolkit/docs/arch decisions/ADR-010-COGNITO-EXTERNAL-IDP-STRATEGY.md
 */

'use client';

import * as React from 'react';
import { OrgProvider, createOktaAuthAdapter } from '@{{PROJECT_NAME}}/module-access';

interface OrgProviderWrapperProps {
  children: React.ReactNode;
}

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