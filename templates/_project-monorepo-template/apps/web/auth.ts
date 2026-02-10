import NextAuth from "next-auth";
import Okta from "next-auth/providers/okta";
import type { NextAuthConfig } from "next-auth";

/**
 * NextAuth.js v5 Configuration with Okta Provider
 *
 * This configuration enables OAuth 2.0/OIDC authentication with Okta,
 * maintaining compatibility with the existing Lambda authorizer backend.
 *
 * Key Features:
 * - PKCE flow for enhanced security
 * - Groups claim extraction for role-based authorization
 * - Access token passthrough for backend API calls
 * - HTTP-only cookies for session management
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Okta({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
      // Request standard OIDC scopes
      // Groups are provided via Okta claims configuration, not as a scope
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
     * JWT Callback - Augment JWT with access token and groups
     *
     * This callback runs whenever a JWT is created or updated.
     * We store the access token and groups claim for use in API calls.
     */
    async jwt({ token, account, profile }) {
      // On initial sign in, add access token from Okta
      // Roles will be fetched from backend database, not from Okta
      if (account && profile) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }

      return token;
    },

    /**
     * Session Callback - Add custom fields to session object
     *
     * This makes the access token and tokens available to client components
     * via useSession() hook.
     */
    async session({ session, token }) {
      // Add tokens for API calls
      // Backend will validate token and return user role from database
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
      session.expiresAt = token.expiresAt as number;
      session.user.id = token.sub as string;

      return session;
    },

    /**
     * Authorized Callback - Control access to routes
     *
     * This runs on every request when using middleware.
     * Return true to allow access, false to deny.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = nextUrl.pathname.startsWith("/api/auth");
      const isOnErrorPage = nextUrl.pathname.startsWith("/auth/error");
      const isOnSignInPage = nextUrl.pathname.startsWith("/auth/signin");

      // Allow access to auth API routes, error pages, and signin pages
      if (isOnAuthPage || isOnErrorPage || isOnSignInPage) {
        return true;
      }

      // Require authentication for all other routes (including "/")
      return isLoggedIn;
    },
  },

  pages: {
    // Use NextAuth's default sign-in page
    // Custom sign-in page should be at /auth/signin (not /api/auth/signin)
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour (matches Okta token expiration)
  },

  debug: false,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
