/**
 * Auth Adapters Index
 *
 * Re-exports all auth adapter types and factory functions.
 * Import from this file for cleaner imports.
 *
 * @example
 * ```tsx
 * import {
 *   AuthAdapter,
 *   createClerkAuthAdapter,
 *   createOktaAuthAdapter
 * } from '@module-access/adapters';
 * ```
 */

// Types
export type { AuthAdapter, AuthProvider, AuthConfig } from "./types";

// Clerk Adapters
export {
  createClerkAuthAdapter,
  createClerkAuthAdapterWithOptions,
  createClerkServerAdapter,
} from "./clerk-adapter";

// Okta Adapters
export { createOktaAuthAdapter, createOktaServerAdapter } from "./okta-adapter";
