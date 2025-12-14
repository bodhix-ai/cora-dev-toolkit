/**
 * Dynamic Authentication Provider
 *
 * Wraps the application with the correct auth provider based on environment configuration.
 * Supports both Clerk and Okta (via NextAuth) authentication providers.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { AuthProvider } from 'module-access/frontend/components/AuthProvider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>{children}</AuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { SessionProvider } from "next-auth/react";

/**
 * Auth provider type
 */
export type AuthProvider = "clerk" | "okta";

/**
 * AuthProvider component props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Get active auth provider from environment
 * Defaults to 'clerk' if not configured
 */
function getActiveAuthProvider(): AuthProvider {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProvider;

  if (!provider || !["clerk", "okta"].includes(provider)) {
    console.warn(
      `[AuthProvider] Invalid AUTH_PROVIDER "${provider}", defaulting to clerk`
    );
    return "clerk";
  }

  return provider;
}

/**
 * Dynamic Authentication Provider Component
 *
 * Automatically wraps app with correct provider based on NEXT_PUBLIC_AUTH_PROVIDER env var.
 * - clerk: Uses ClerkProvider
 * - okta: Uses NextAuth SessionProvider
 *
 * This allows projects to switch authentication providers by changing environment variables
 * without modifying code.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const provider = getActiveAuthProvider();

  if (provider === "clerk") {
    return (
      <ClerkProvider
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        {children}
      </ClerkProvider>
    );
  }

  if (provider === "okta") {
    return <SessionProvider>{children}</SessionProvider>;
  }

  throw new Error(`[AuthProvider] Unsupported auth provider: ${provider}`);
}
