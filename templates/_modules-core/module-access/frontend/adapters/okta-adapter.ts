/**
 * Okta Auth Adapter
 *
 * Provides authentication token from NextAuth/Okta to OrgContext.
 * Used when auth.provider = 'okta' in the project configuration.
 *
 * This adapter bridges NextAuth sessions to the CORA API client,
 * providing the JWT token needed for API Gateway authorization.
 */

import { getSession, signOut } from "next-auth/react";
import type { AuthAdapter } from "./types";
import type { OktaSession } from "../providers/okta";

/**
 * Create Okta Auth Adapter for client-side usage
 *
 * Uses NextAuth's getSession() to retrieve the current session
 * and extract the access token for API calls.
 *
 * @returns AuthAdapter instance
 *
 * @example
 * ```tsx
 * import { createOktaAuthAdapter } from '@module-access/adapters';
 *
 * function MyComponent() {
 *   const authAdapter = createOktaAuthAdapter();
 *
 *   return (
 *     <OrgProvider authAdapter={authAdapter}>
 *       <App />
 *     </OrgProvider>
 *   );
 * }
 * ```
 */
export function createOktaAuthAdapter(): AuthAdapter {
  return {
    getToken: async () => {
      try {
        const session = (await getSession()) as OktaSession | null;

        if (!session) {
          console.warn("[OktaAdapter] No session found");
          return null;
        }

        // Check for refresh token errors
        if (session.error === "RefreshTokenError") {
          console.error(
            "[OktaAdapter] Session has refresh token error, user needs to re-authenticate"
          );
          return null;
        }

        // Return the access token (used for API Gateway authorization)
        // The Lambda authorizer expects a JWT from Okta
        const token = session.accessToken || session.idToken;

        if (!token) {
          console.warn("[OktaAdapter] Session exists but no token found");
          return null;
        }

        return token;
      } catch (error) {
        console.error("[OktaAdapter] Error getting token:", error);
        return null;
      }
    },
    signOut: async () => {
      await signOut();
    },
  };
}

/**
 * Create Okta Auth Adapter for server-side usage
 *
 * Uses getServerSession for server components and API routes.
 * Requires passing the NextAuth options.
 *
 * @param getServerSessionFn - The getServerSession function from next-auth
 * @param authOptions - NextAuth options (from providers/okta.ts)
 * @returns AuthAdapter instance
 *
 * @example
 * ```ts
 * // In a server component or API route
 * import { getServerSession } from "next-auth";
 * import { createOktaServerAdapter } from '@module-access/adapters';
 * import { oktaAuthOptions } from '@module-access/providers';
 *
 * const authAdapter = createOktaServerAdapter(getServerSession, oktaAuthOptions);
 * const token = await authAdapter.getToken();
 * ```
 */
export function createOktaServerAdapter(
  getServerSessionFn: () => Promise<OktaSession | null>
): AuthAdapter {
  return {
    getToken: async () => {
      try {
        const session = await getServerSessionFn();

        if (!session) {
          console.warn("[OktaServerAdapter] No session found");
          return null;
        }

        if (session.error === "RefreshTokenError") {
          console.error("[OktaServerAdapter] Session has refresh token error");
          return null;
        }

        const token = session.accessToken || session.idToken;

        if (!token) {
          console.warn("[OktaServerAdapter] Session exists but no token found");
          return null;
        }

        return token;
      } catch (error) {
        console.error("[OktaServerAdapter] Error getting token:", error);
        return null;
      }
    },
    signOut: async () => {
      console.warn("[OktaServerAdapter] signOut called on server side - no-op");
    },
  };
}
