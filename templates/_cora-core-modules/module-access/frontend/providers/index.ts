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
 * ```
 */

// Okta Provider
export {
  oktaAuthOptions,
  createOktaAuthOptions,
  getOktaConfig,
  type OktaConfig,
  type OktaSession,
  type OktaJWT,
} from "./okta";

// Clerk Provider
export {
  getClerkConfig,
  isClerkConfigured,
  clerkRoutes,
  clerkPublicRoutes,
  type ClerkConfig,
} from "./clerk";
