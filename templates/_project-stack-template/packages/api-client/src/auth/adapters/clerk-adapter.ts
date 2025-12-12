/**
 * Clerk Authentication Adapter for CORA
 *
 * Wraps Clerk authentication hooks to provide the standard CoraAuthAdapter interface.
 * This allows CORA modules to work with Clerk without direct dependency.
 *
 * Usage in Next.js app:
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapter } from '@pm-app/api-client';
 * import { useProviders } from '@pm-app/ai-enablement-module';
 *
 * function MyComponent() {
 *   const clerkAuth = useAuth();
 *   const authAdapter = createClerkAuthAdapter(clerkAuth);
 *   const { providers } = useProviders(authAdapter);
 * }
 * ```
 */

import type { CoraAuthAdapter } from "../types";

/**
 * Clerk's useAuth hook return type (minimal interface)
 * We define this locally to avoid direct dependency on @clerk/nextjs in this package
 */
interface ClerkAuthContext {
  getToken: (options?: { template?: string }) => Promise<string | null>;
  userId: string | null | undefined;
  orgId: string | null | undefined;
  isSignedIn?: boolean;
  signOut: () => Promise<void>;
}

/**
 * Create a CORA auth adapter from Clerk's useAuth hook
 *
 * @param clerkAuth - The return value from Clerk's useAuth() hook
 * @returns CoraAuthAdapter instance
 *
 * @example
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapter } from '@pm-app/api-client';
 *
 * function MyComponent() {
 *   const clerkAuth = useAuth();
 *   const authAdapter = createClerkAuthAdapter(clerkAuth);
 *   // Use authAdapter with CORA hooks
 * }
 * ```
 */
export function createClerkAuthAdapter(
  clerkAuth: ClerkAuthContext
): CoraAuthAdapter {
  return {
    /**
     * Get authentication token from Clerk
     * Uses "policy-supabase" template to get JWT with proper claims
     */
    getToken: async (): Promise<string | null> => {
      try {
        // Request token with policy-supabase template for Supabase compatibility
        const token = await clerkAuth.getToken({ template: "policy-supabase" });
        return token;
      } catch (error) {
        console.error("[ClerkAuthAdapter] Error getting token:", error);
        return null;
      }
    },

    /**
     * Sign out the user
     */
    signOut: async (): Promise<void> => {
      await clerkAuth.signOut();
    },

    /**
     * Get current organization ID from Clerk context
     */
    getOrgId: (): string | null => {
      return clerkAuth.orgId || null;
    },

    /**
     * Get current user ID from Clerk context
     */
    getUserId: (): string | null => {
      return clerkAuth.userId || null;
    },

    /**
     * Get raw Clerk auth context (escape hatch)
     * Use only for advanced cases not covered by the adapter interface
     */
    getRawProvider: (): unknown => {
      return clerkAuth;
    },
  };
}

/**
 * Utility: Check if user is authenticated via Clerk
 * @param clerkAuth - The return value from Clerk's useAuth() hook
 * @returns true if user is signed in
 */
export function isClerkAuthenticated(clerkAuth: ClerkAuthContext): boolean {
  return clerkAuth.isSignedIn === true || clerkAuth.userId !== null;
}
