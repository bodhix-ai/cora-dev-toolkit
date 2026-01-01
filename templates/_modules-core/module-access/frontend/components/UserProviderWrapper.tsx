/**
 * UserProvider Wrapper Component
 * 
 * Wraps UserProvider with authentication context from useUnifiedAuth.
 * This component acts as a bridge between the unified auth system
 * and the UserProvider that needs authAdapter and isAuthenticated props.
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * <AuthProvider>
 *   <UserProviderWrapper>
 *     <SessionTracking />
 *     {children}
 *   </UserProviderWrapper>
 * </AuthProvider>
 * ```
 */

"use client";

import React, { ReactNode, useMemo } from "react";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { UserProvider } from "../contexts/UserContext";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

interface UserProviderWrapperProps {
  children: ReactNode;
}

/**
 * UserProviderWrapper Component
 * 
 * Gets auth state from useUnifiedAuth hook and passes it to UserProvider.
 * Must be placed inside AuthProvider to work correctly.
 */
export function UserProviderWrapper({ children }: UserProviderWrapperProps) {
  const { isSignedIn, getToken, signOut } = useUnifiedAuth();

  // Memoize authAdapter to prevent infinite re-render loop
  const authAdapter = useMemo<CoraAuthAdapter>(() => ({
    getToken,
    signOut,
  }), [getToken, signOut]);

  return (
    <UserProvider
      authAdapter={authAdapter}
      isAuthenticated={isSignedIn}
    >
      {children}
    </UserProvider>
  );
}
