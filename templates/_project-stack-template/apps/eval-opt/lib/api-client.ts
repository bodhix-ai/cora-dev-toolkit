/**
 * API Client for Eval Optimizer
 * 
 * CRITICAL: This demonstrates ADR-004 compliance and code reuse in Option A.
 * 
 * Key Points:
 * - Imports createAuthenticatedClient from shared @{{PROJECT_NAME}}/api-client package
 * - Uses factory pattern (not direct exports)
 * - Wraps shared factory with optimizer-specific configuration
 * 
 * This proves Option A (Same Stack Repo) enables:
 * - Direct import from workspace packages (no duplication)
 * - Shared type definitions
 * - Consistent API client patterns across apps
 * 
 * @see ADR-004: NextAuth API Client Pattern
 * @see templates/_project-stack-template/packages/api-client/
 */

import { createAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Create API client for CORA module APIs
 * 
 * Usage:
 * ```ts
 * const { data: session } = useSession();
 * const client = createApiClient(session.accessToken);
 * const result = await client.post('/access/orgs', { ... });
 * ```
 * 
 * @param accessToken - JWT access token from NextAuth session
 * @returns Authenticated API client
 */
export function createApiClient(accessToken: string) {
  // Use shared factory from workspace package
  // This is the same client used by the main app
  return createAuthenticatedClient(accessToken);
}

/**
 * Example: Type-safe API calls
 * 
 * Future enhancement: Import shared types from @{{PROJECT_NAME}}/shared-types
 * 
 * ```ts
 * import type { Organization, Workspace, Document } from "@{{PROJECT_NAME}}/shared-types";
 * 
 * const org: Organization = await client.post<Organization>('/access/orgs', { ... });
 * const ws: Workspace = await client.post<Workspace>('/ws/workspaces', { ... });
 * const doc: Document = await client.post<Document>('/kb/documents', { ... });
 * ```
 */