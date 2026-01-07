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
 * 
 * Also includes HTTP methods for API calls (authenticated with the token).
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

  /**
   * Perform authenticated GET request
   */
  get: <T = unknown>(url: string) => Promise<{ data: T; success: boolean }>;

  /**
   * Perform authenticated PUT request
   */
  put: <T = unknown>(url: string, data: unknown) => Promise<{ data: T; success: boolean }>;

  /**
   * Perform authenticated POST request
   */
  post: <T = unknown>(url: string, data?: unknown) => Promise<{ data: T; success: boolean }>;

  /**
   * Perform authenticated DELETE request
   */
  delete: <T = unknown>(url: string) => Promise<{ data: T; success: boolean }>;
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
