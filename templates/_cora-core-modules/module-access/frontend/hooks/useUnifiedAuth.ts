/**
 * Unified Authentication Hook
 *
 * Provides consistent interface regardless of auth provider (Clerk or Okta).
 * Adapts provider-specific auth hooks to a common interface.
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

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Auth provider type
 */
export type AuthProvider = "clerk" | "okta";

/**
 * Unified auth state interface
 * Consistent across all auth providers
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
 * Get active auth provider from environment
 * Defaults to 'clerk' if not configured
 */
function getActiveAuthProvider(): AuthProvider {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProvider;

  if (!provider || !["clerk", "okta"].includes(provider)) {
    console.warn(
      `[useUnifiedAuth] Invalid AUTH_PROVIDER "${provider}", defaulting to clerk`
    );
    return "clerk";
  }

  return provider;
}

/**
 * Unified Authentication Hook
 *
 * Automatically uses the correct auth provider based on NEXT_PUBLIC_AUTH_PROVIDER env var.
 * Provides consistent interface regardless of provider.
 *
 * @returns Unified auth state
 */
export function useUnifiedAuth(): UnifiedAuthState {
  const provider = getActiveAuthProvider();

  if (provider === "clerk") {
    return useClerkAuthAdapter();
  } else if (provider === "okta") {
    return useOktaAuthAdapter();
  }

  throw new Error(`[useUnifiedAuth] Unsupported auth provider: ${provider}`);
}

/**
 * Clerk Auth Adapter
 * Adapts Clerk's useAuth hook to unified interface
 */
function useClerkAuthAdapter(): UnifiedAuthState {
  const clerk = useClerkAuth();

  return {
    isSignedIn: clerk.isSignedIn ?? false,
    userId: clerk.userId,
    isLoading: !clerk.isLoaded,
    getToken: async () => {
      try {
        return await clerk.getToken();
      } catch (error) {
        console.error("[useUnifiedAuth:Clerk] Error getting token:", error);
        return null;
      }
    },
    signOut: async () => {
      try {
        await clerk.signOut();
      } catch (error) {
        console.error("[useUnifiedAuth:Clerk] Error signing out:", error);
        throw error;
      }
    },
  };
}

/**
 * Okta Auth Adapter (via NextAuth)
 * Adapts NextAuth's useSession hook to unified interface
 */
function useOktaAuthAdapter(): UnifiedAuthState {
  const { data: session, status } = useSession();

  return {
    isSignedIn: !!session,
    userId: session?.user?.id ?? null,
    isLoading: status === "loading",
    getToken: async () => {
      try {
        if (!session?.accessToken) {
          return null;
        }
        return session.accessToken;
      } catch (error) {
        console.error("[useUnifiedAuth:Okta] Error getting token:", error);
        return null;
      }
    },
    signOut: async () => {
      try {
        await nextAuthSignOut();
      } catch (error) {
        console.error("[useUnifiedAuth:Okta] Error signing out:", error);
        throw error;
      }
    },
  };
}
