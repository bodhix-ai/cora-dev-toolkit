/**
 * CORA Authentication Adapter Interface
 *
 * This interface defines a standardized way for CORA modules to interact with
 * various Identity Providers (IdPs) without being coupled to any specific implementation.
 *
 * Supported IdPs (via adapters):
 * - Clerk (clerk-adapter.ts)
 * - Future: NextAuth, Okta, AWS Cognito, Azure AD, etc.
 */

/**
 * Standard authentication adapter interface for CORA modules
 *
 * CORA modules should depend ONLY on this interface, never directly on
 * IdP-specific libraries (Clerk, NextAuth, Okta, etc.)
 */
export interface CoraAuthAdapter {
  /**
   * Get the current authentication token (JWT)
   * @returns Promise resolving to JWT token string, or null if not authenticated
   */
  getToken(): Promise<string | null>;

  /**
   * Sign the user out
   * @returns Promise that resolves when sign out is complete
   */
  signOut(): Promise<void>;

  /**
   * Get the current organization ID (for multi-tenant operations)
   * @returns Organization ID string, or null if not in org context
   */
  getOrgId?(): string | null;

  /**
   * Get the current user ID
   * @returns User ID string, or null if not authenticated
   */
  getUserId?(): string | null;

  /**
   * Escape hatch: Get the raw IdP provider object for advanced use cases
   * Use sparingly - prefer adding methods to the interface instead
   * @returns The underlying IdP provider object (Clerk, NextAuth session, etc.)
   */
  getRawProvider?(): unknown;
}

/**
 * Factory function type for creating auth adapters
 * Each IdP adapter should export a function matching this signature
 */
export type CreateAuthAdapter<T = unknown> = (context: T) => CoraAuthAdapter;

/**
 * Result type for operations that may fail due to auth issues
 */
export interface AuthenticatedResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  authError?: boolean; // true if error is auth-related (no token, expired, etc.)
}
