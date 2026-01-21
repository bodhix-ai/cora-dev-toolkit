// TypeScript module augmentation for NextAuth.js
// Extends the default Session type with custom properties

import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession`, and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken: string;
    idToken: string;
    expiresAt: number;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    accessToken?: string;
    idToken?: string;
    expiresAt?: number;
  }
}
