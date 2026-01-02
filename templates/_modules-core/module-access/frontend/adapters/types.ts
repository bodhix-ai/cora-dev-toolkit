/**
 * Auth Adapter Interface
 *
 * Common interface for all authentication adapters (Clerk, Okta, etc.)
 * Used by OrgContext to get authentication tokens for API calls.
 */

/**
 * Authentication adapter interface
 *
 * All auth adapters must implement this interface to work with OrgContext.
 * The getToken function returns a JWT that is sent to the API Gateway
 * Lambda authorizer for verification.
 */
export interface AuthAdapter {
  /**
   * Get the current authentication token
   *
   * @returns Promise resolving to JWT token string, or null if not authenticated
   */
  getToken: () => Promise<string | null>;

  /**
   * Sign the user out
   * @returns Promise that resolves when sign out is complete
   */
  signOut: () => Promise<void>;
}

/**
 * Auth provider type enumeration
 */
export type AuthProvider = "clerk" | "okta";

/**
 * Auth configuration passed to OrgProvider
 */
export interface AuthConfig {
  /**
   * The authentication provider being used
   */
  provider: AuthProvider;

  /**
   * The auth adapter instance
   */
  adapter: AuthAdapter;
}
