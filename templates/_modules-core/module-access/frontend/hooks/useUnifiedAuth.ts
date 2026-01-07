/**
 * Unified Authentication Hook
 *
 * Provides consistent interface for NextAuth authentication.
 * Adapts NextAuth's useSession hook to a unified interface.
 *
 * @example
 * ```tsx
 * import { useUnifiedAuth } from 'module-access/frontend/hooks/useUnifiedAuth';
 *
 * function MyComponent() {
 *   const { isSignedIn, userId, getToken, signOut } = useUnifiedAuth();
 *
 *   if (!isSignedIn) {
 *     return <div>Please sign in</div>;
 *   }
 *
 *   return <div>Welcome, {userId}!</div>;
 * }
 * ```
 */

"use client";

import { useCallback } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Unified auth state interface
 */
export interface UnifiedAuthState {
  /** Whether user is authenticated */
  isSignedIn: boolean;

  /** User ID (null if not authenticated) */
  userId: string | null;

  /** Whether auth state is still loading */
  isLoading: boolean;

  /** Get authentication token for API calls */
  getToken: () => Promise<string | null>;

  /** Sign out the current user */
  signOut: () => Promise<void>;
}

/**
 * Unified Authentication Hook
 *
 * Uses NextAuth's useSession hook and adapts it to a consistent interface.
 *
 * @returns Unified auth state
 */
export function useUnifiedAuth(): UnifiedAuthState {
  const { data: session, status } = useSession();

  // Extract stable primitive to prevent infinite re-render loops
  // Use type assertion for custom session properties added via next-auth.d.ts
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? null;
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  
  // Use status from NextAuth for reliable authentication state
  const isSignedIn = status === "authenticated";

  console.log('[useUnifiedAuth] status:', status, 'isSignedIn:', isSignedIn, 'session:', !!session);

  const getToken = useCallback(async () => {
    try {
      return accessToken;
    } catch (error) {
      console.error("[useUnifiedAuth] Error getting token:", error);
      return null;
    }
  }, [accessToken]);

  const signOut = useCallback(async () => {
    try {
      await nextAuthSignOut();
    } catch (error) {
      console.error("[useUnifiedAuth] Error signing out:", error);
      throw error;
    }
  }, []);

  return {
    isSignedIn,
    userId,
    isLoading: status === "loading",
    getToken,
    signOut,
  };
}
