"use client";

import { useEffect, useRef } from "react";
import { useUnifiedAuth } from "@{{PROJECT_NAME}}/module-access";

/**
 * Token manager for handling authentication tokens
 * Works with both Clerk and Okta authentication providers
 */
export function useTokenManager() {
  const { getToken } = useUnifiedAuth();

  return {
    getValidToken: async () => {
      try {
        const token = await getToken();
        return token;
      } catch (error) {
        console.error("Failed to get token:", error);
        return null;
      }
    },
  };
}

/**
 * Hook to manage authentication state changes
 * Works with both Clerk and Okta authentication providers
 */
export function useAuthStateManager(
  onAuthChange: (isAuthenticated: boolean) => void
) {
  const { isSignedIn } = useUnifiedAuth();
  const previousAuthState = useRef(isSignedIn);

  useEffect(() => {
    if (previousAuthState.current !== isSignedIn) {
      onAuthChange(!!isSignedIn);
      previousAuthState.current = isSignedIn;
    }
  }, [isSignedIn, onAuthChange]);
}

/**
 * Performs a complete logout:
 * 1. Signs out from auth provider (Clerk/Okta)
 * 2. CORA context automatically clears profile state
 * 3. Redirects to sign-in page
 *
 * @param signOut - Auth provider signOut function
 */
export async function performLogout(
  signOut: (options?: { redirectUrl?: string }) => Promise<void>
): Promise<void> {
  try {
    console.log("🚪 Initiating logout");

    // Sign out from auth provider (clears cookies/tokens)
    // CORA context automatically clears profile state
    await signOut({ redirectUrl: "/sign-in" });

    console.log("✅ Logout complete");
  } catch (error) {
    console.error("❌ Logout failed:", error);

    // If signOut fails, redirect manually
    window.location.href = "/sign-in";
  }
}

/**
 * React hook that provides a logout function
 * Usage: const logout = useLogout();
 * Works with both Clerk and Okta authentication providers
 *
 * @returns An async function that performs logout
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const logout = useLogout();
 *
 *   return (
 *     <button onClick={logout}>
 *       Log out
 *     </button>
 *   );
 * };
 * ```
 */
export function useLogout() {
  const { signOut } = useUnifiedAuth();

  return async () => {
    await performLogout(signOut);
  };
}
