/**
 * NextAuth API Route Handler
 *
 * Handles all authentication flows for Okta (and other NextAuth providers).
 * This file is required when NEXT_PUBLIC_AUTH_PROVIDER=okta.
 *
 * @see https://next-auth.js.org/configuration/initialization#route-handlers-app
 */

import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

/**
 * Okta session type with custom properties
 */
interface OktaSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  idToken?: string;
  error?: string;
  expires: string;
}

/**
 * NextAuth Configuration
 *
 * Configured for Okta OAuth 2.0 / OIDC
 */
const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "okta",
      name: "Okta",
      type: "oauth",
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      wellKnown: `${process.env.OKTA_ISSUER}/.well-known/openid-configuration`,
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    /**
     * JWT Callback
     *
     * Runs whenever a JWT is created or updated.
     * Stores access_token and id_token from Okta for API calls.
     *
     * Note: User provisioning is handled automatically by the profiles Lambda
     * when the app calls GET /profiles/me. The Lambda will auto-provision
     * users if they don't exist in the database.
     */
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.sub = profile.sub;
      }

      return token;
    },

    /**
     * Session Callback
     *
     * Runs whenever session is checked (e.g., useSession, getSession, getServerSession).
     * Exposes tokens to client-side for API calls.
     */
    async session({ session, token }: { session: any; token: JWT }) {
      const oktaSession = session as OktaSession;

      // Add user ID and tokens to session
      oktaSession.user.id = token.sub as string;
      oktaSession.accessToken = token.accessToken as string;
      oktaSession.idToken = token.idToken as string;

      // Handle token refresh errors
      if (token.error) {
        oktaSession.error = token.error as string;
      }

      return oktaSession;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

// Export handlers for App Router
export { handler as GET, handler as POST };
