/**
 * Clerk Provider Configuration
 *
 * This module provides the Clerk authentication configuration.
 * Used when auth.provider = 'clerk' in the project configuration.
 *
 * Clerk handles its own session management, so this is simpler than Okta/NextAuth.
 *
 * @see https://clerk.com/docs/references/nextjs/overview
 */

/**
 * Clerk environment variables required for configuration
 */
export interface ClerkConfig {
  publishableKey: string;
  secretKey: string;
}

/**
 * Get Clerk configuration from environment variables
 * Validates that all required variables are present
 */
export function getClerkConfig(): ClerkConfig {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error(
      "Missing required Clerk environment variables: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY"
    );
  }

  return { publishableKey, secretKey };
}

/**
 * Clerk route configuration for auth pages
 */
export const clerkRoutes = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  afterSignIn: "/dashboard",
  afterSignUp: "/onboarding",
};

/**
 * Clerk middleware configuration
 * Define public routes that don't require authentication
 */
export const clerkPublicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/webhooks(.*)",
];

/**
 * Check if Clerk is configured
 * Useful for conditionally rendering auth components
 */
export function isClerkConfigured(): boolean {
  try {
    getClerkConfig();
    return true;
  } catch {
    return false;
  }
}
