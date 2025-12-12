/**
 * Auth Adapter Interface
 * Used by OrgContext to get authentication tokens
 */
export interface AuthAdapter {
  getToken: () => Promise<string | null>;
}

/**
 * Create Clerk Auth Adapter
 *
 * Provides authentication token from Clerk to OrgContext
 * Must be called from within a React component where useAuth hook is available
 *
 * @param getTokenFn - Clerk's getToken function from useAuth hook
 * @returns AuthAdapter instance
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
        console.error("Error getting token from Clerk:", error);
        return null;
      }
    },
  };
}
