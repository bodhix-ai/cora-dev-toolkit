import NextAuth from "next-auth";
import Okta from "next-auth/providers/okta";
import type { NextAuthConfig } from "next-auth";

/**
 * NextAuth.js v5 Configuration for Eval Optimizer
 *
 * CRITICAL: This uses the SAME Okta/Cognito configuration as the main app.
 * Users authenticate once and can access both apps with the same session.
 *
 * Key Features:
 * - Shared Okta provider with main app
 * - Access token passthrough for CORA API calls
 * - HTTP-only cookies for session management
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Okta({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
      authorization: {
        url: `${process.env.OKTA_ISSUER}/v1/authorize`,
        params: {
          scope: "openid profile email",
        },
      },
    }),
  ],

  callbacks: {
    /**
     * JWT Callback - Augment JWT with access token
     */
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }

      return token;
    },

    /**
     * Session Callback - Add custom fields to session object
     */
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
      session.expiresAt = token.expiresAt as number;
      session.user.id = token.sub as string;

      return session;
    },

    /**
     * Authorized Callback - Control access to routes
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = nextUrl.pathname.startsWith("/api/auth");
      const isOnErrorPage = nextUrl.pathname.startsWith("/auth/error");
      const isOnSignInPage = nextUrl.pathname.startsWith("/auth/signin");

      // Allow access to auth pages
      if (isOnAuthPage || isOnErrorPage || isOnSignInPage) {
        return true;
      }

      // Require authentication for all other routes
      return isLoggedIn;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  },

  debug: false,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);