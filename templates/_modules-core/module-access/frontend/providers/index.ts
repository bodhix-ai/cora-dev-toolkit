/**
 * Auth Providers Index
 *
 * Re-exports all auth provider configurations.
 * Import from this file for cleaner imports.
 *
 * @example
 * ```tsx
 * // For Okta
 * import { oktaAuthOptions, createOktaAuthOptions } from '@module-access/providers';
 *
 * // For Clerk
 * import { getClerkConfig, clerkRoutes } from '@module-access/providers';
 *
 * // Get active provider
 * import { getActiveAuthProvider } from '@module-access/providers';
 * ```
 */

// Auth Provider Types
export type AuthProvider = "clerk" | "okta";

/**
 * Get active auth provider from environment
 * Defaults to 'clerk' if not configured
 */
export function getActiveAuthProvider(): AuthProvider {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProvider;

  if (!provider || !["clerk", "okta"].includes(provider)) {
    console.warn(
      `[getActiveAuthProvider] Invalid AUTH_PROVIDER "${provider}", defaulting to okta`
    );
    return "okta";
  }

  return provider;
}

// Okta Provider
export {
  createOktaAuthOptions,
  getOktaConfig,
  type OktaConfig,
  type OktaSession,
  type OktaJWT,
} from "./okta";
