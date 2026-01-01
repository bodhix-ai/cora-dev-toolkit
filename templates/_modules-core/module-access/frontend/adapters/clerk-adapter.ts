/**
 * Clerk Auth Adapter
 *
 * Provides authentication token from Clerk to OrgContext.
 * Used when auth.provider = 'clerk' in the project configuration.
 *
 * Clerk manages its own session, so this adapter simply wraps
 * Clerk's getToken function from the useAuth hook.
 */

import type { AuthAdapter } from "./types";

/**
 * Create Clerk Auth Adapter
 *
 * Provides authentication token from Clerk to OrgContext.
 * Must be called from within a React component where useAuth hook is available.
 *
 * @param getTokenFn - Clerk's getToken function from useAuth hook
 * @returns AuthAdapter instance
 *
 * @example
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapter } from '@module-access/adapters';
 *
 * function MyComponent() {
 *   const { getToken } = useAuth();
 *   const authAdapter = createClerkAuthAdapter(getToken);
 *
 *   return (
 *     <OrgProvider authAdapter={authAdapter}>
 *       <App />
 *     </OrgProvider>
 *   );
 * }
 * ```
 */
export function createClerkAuthAdapter(
  getTokenFn: () => Promise<string | null>
): AuthAdapter {
  return {
    getToken: async () => {
      try {
        const token = await getTokenFn();
        return token;
      } catch (error) {
        console.error("[ClerkAdapter] Error getting token from Clerk:", error);
        return null;
      }
    },
  };
}

/**
 * Create Clerk Auth Adapter with custom options
 *
 * Allows passing Clerk's getToken options for customizing the JWT.
 *
 * @param getTokenFn - Clerk's getToken function from useAuth hook
 * @param options - Options to pass to Clerk's getToken
 * @returns AuthAdapter instance
 *
 * @example
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapterWithOptions } from '@module-access/adapters';
 *
 * function MyComponent() {
 *   const { getToken } = useAuth();
 *
 *   // Get token for a specific template (if configured in Clerk Dashboard)
 *   const authAdapter = createClerkAuthAdapterWithOptions(
 *     getToken,
 *     { template: 'supabase' }
 *   );
 *
 *   return (
 *     <OrgProvider authAdapter={authAdapter}>
 *       <App />
 *     </OrgProvider>
 *   );
 * }
 * ```
 */
export function createClerkAuthAdapterWithOptions(
  getTokenFn: (options?: { template?: string }) => Promise<string | null>,
  options?: { template?: string }
): AuthAdapter {
  return {
    getToken: async () => {
      try {
        const token = await getTokenFn(options);
        return token;
      } catch (error) {
        console.error("[ClerkAdapter] Error getting token from Clerk:", error);
        return null;
      }
    },
  };
}

/**
 * Create Clerk Auth Adapter for server-side usage
 *
 * Uses Clerk's auth() helper for server components and API routes.
 *
 * @param authFn - Clerk's auth function from @clerk/nextjs/server
 * @returns AuthAdapter instance
 *
 * @example
 * ```ts
 * // In a server component or API route
 * import { auth } from '@clerk/nextjs/server';
 * import { createClerkServerAdapter } from '@module-access/adapters';
 *
 * const authAdapter = createClerkServerAdapter(auth);
 * const token = await authAdapter.getToken();
 * ```
 */
export function createClerkServerAdapter(
  authFn: () => Promise<{ getToken: () => Promise<string | null> }>
): AuthAdapter {
  return {
    getToken: async () => {
      try {
        const authObj = await authFn();
        const token = await authObj.getToken();
        return token;
      } catch (error) {
        console.error(
          "[ClerkServerAdapter] Error getting token from Clerk:",
          error
        );
        return null;
      }
    },
  };
}
