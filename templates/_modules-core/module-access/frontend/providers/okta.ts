/**
 * NextAuth Okta Provider Configuration
 *
 * This module provides the NextAuth.js configuration for Okta OIDC authentication.
 * Used when auth.provider = 'okta' in the project configuration.
 *
 * @see https://next-auth.js.org/providers/okta
 */

import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import OktaProvider from "next-auth/providers/okta";

/**
 * Okta environment variables required for NextAuth
 */
export interface OktaConfig {
  clientId: string;
  clientSecret: string;
  issuer: string;
}

/**
 * Extended session type with Okta-specific fields
 */
export interface OktaSession extends Session {
  accessToken: string;
  idToken: string;
  expiresAt: number;
  oktaUserId?: string;
  error?: string;
}

/**
 * Extended JWT type with Okta tokens
 */
export interface OktaJWT extends JWT {
  accessToken?: string;
  idToken?: string;
  oktaUserId?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
}

/**
 * Get Okta configuration from environment variables
 * Validates that all required variables are present
 */
export function getOktaConfig(): OktaConfig {
  const clientId = process.env.OKTA_CLIENT_ID;
  const clientSecret = process.env.OKTA_CLIENT_SECRET;
  const issuer = process.env.OKTA_ISSUER;

  if (!clientId || !clientSecret || !issuer) {
    throw new Error(
      "Missing required Okta environment variables: OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, OKTA_ISSUER"
    );
  }

  return { clientId, clientSecret, issuer };
}

/**
 * Create NextAuth options configured for Okta
 *
 * @param config - Optional Okta configuration (defaults to env vars)
 * @returns NextAuthOptions configured for Okta OIDC
 */
export function createOktaAuthOptions(
  config?: Partial<OktaConfig>
): NextAuthOptions {
  const oktaConfig = {
    ...getOktaConfig(),
    ...config,
  };

  return {
    providers: [
      OktaProvider({
        clientId: oktaConfig.clientId,
        clientSecret: oktaConfig.clientSecret,
        issuer: oktaConfig.issuer,
        authorization: {
          params: {
            scope: "openid email profile",
          },
        },
      }),
    ],
    callbacks: {
      /**
       * JWT callback - Store Okta tokens in the JWT
       */
      async jwt({ token, account, user }): Promise<OktaJWT> {
        // Initial sign-in - store tokens from Okta
        if (account && user) {
          return {
            ...token,
            accessToken: account.access_token,
            idToken: account.id_token,
            oktaUserId: account.providerAccountId,
            accessTokenExpires: account.expires_at
              ? account.expires_at * 1000
              : undefined,
            refreshToken: account.refresh_token,
          };
        }

        // Subsequent requests - check if token needs refresh
        const oktaToken = token as OktaJWT;

        // Return token if not expired
        if (
          !oktaToken.accessTokenExpires ||
          Date.now() < oktaToken.accessTokenExpires
        ) {
          return oktaToken;
        }

        // Token expired - attempt refresh
        console.log("[Okta] Access token expired, attempting refresh...");
        return refreshOktaToken(oktaToken);
      },

      /**
       * Session callback - Expose tokens to the client session
       */
      async session({ session, token }): Promise<OktaSession> {
        const oktaToken = token as OktaJWT;

        return {
          ...session,
          accessToken: oktaToken.accessToken ?? "",
          idToken: oktaToken.idToken ?? "",
          expiresAt: oktaToken.accessTokenExpires ?? Date.now(),
          oktaUserId: oktaToken.oktaUserId,
          error: oktaToken.error,
        };
      },

      /**
       * Sign-in callback - Optional additional validation
       */
      async signIn({ user, account, profile }) {
        // Add any custom sign-in validation here
        // For example, check if user's email domain is allowed
        console.log("[Okta] User signed in:", user.email);
        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
    session: {
      strategy: "jwt",
      maxAge: 24 * 60 * 60, // 24 hours
    },
    debug: process.env.NODE_ENV === "development",
  };
}

/**
 * Refresh an expired Okta access token
 *
 * @param token - The current JWT with refresh token
 * @returns Updated JWT with new access token or error
 */
async function refreshOktaToken(token: OktaJWT): Promise<OktaJWT> {
  try {
    const { issuer, clientId, clientSecret } = getOktaConfig();

    // Okta token endpoint
    const tokenEndpoint = `${issuer}/v1/token`;

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken || "",
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("[Okta] Token refresh failed:", refreshedTokens);
      throw new Error("Failed to refresh token");
    }

    console.log("[Okta] Token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("[Okta] Error refreshing token:", error);

    return {
      ...token,
      error: "RefreshTokenError",
    };
  }
}

/**
 * Default NextAuth options for Okta
 * Use this in your [...nextauth]/route.ts
 *
 * Note: This should only be called server-side (in the NextAuth route).
 * Do not export as a module-level constant as it will execute on client-side imports.
 *
 * Example usage:
 * ```typescript
 * import { createOktaAuthOptions } from 'module-access';
 * const authOptions = createOktaAuthOptions();
 * ```
 */
