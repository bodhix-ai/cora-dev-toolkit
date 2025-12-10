/**
 * Module API Client - Factory Pattern
 *
 * This file demonstrates the REQUIRED NextAuth factory pattern for all CORA modules.
 *
 * ✅ CORRECT: Export ONLY factory functions, never direct API objects
 * ❌ WRONG: export const api = { getData: async () => {...} }
 *
 * See: docs/development/MODULE-NEXTAUTH-PATTERN.md for complete details
 */

import type { AuthenticatedClient } from "@sts-career/api-client";

/**
 * Example entity type
 * Replace with your actual entity types from ./types/index.ts
 */
interface Entity {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface EntityCreate {
  org_id: string;
  name: string;
  description?: string;
}

interface EntityUpdate {
  name?: string;
  description?: string;
}

/**
 * Module API Client Interface
 *
 * Define all API methods your module needs.
 * Each method returns a Promise with the appropriate type.
 */
export interface ModuleApiClient {
  // List operations
  listEntities: (orgId: string) => Promise<Entity[]>;

  // CRUD operations
  getEntity: (id: string) => Promise<Entity>;
  createEntity: (entity: EntityCreate) => Promise<Entity>;
  updateEntity: (id: string, entity: EntityUpdate) => Promise<Entity>;
  deleteEntity: (id: string) => Promise<void>;

  // Add your module-specific methods here
}

/**
 * Create Module API Client (Factory Function)
 *
 * This is the ONLY export from this file. Never export direct API objects.
 *
 * @param client - Authenticated client from @sts-career/api-client
 * @returns Module API client with all methods
 *
 * @example
 * ```typescript
 * const { data: session } = useSession();
 * const client = session?.accessToken
 *   ? createAuthenticatedClient(session.accessToken)
 *   : null;
 *
 * if (client) {
 *   const api = createModuleClient(client);
 *   const entities = await api.listEntities(orgId);
 * }
 * ```
 */
export function createModuleClient(
  client: AuthenticatedClient
): ModuleApiClient {
  return {
    // List operations
    listEntities: (orgId: string) =>
      client.get(`/module/entities?orgId=${orgId}`),

    // CRUD operations
    getEntity: (id: string) => client.get(`/module/entities/${id}`),

    createEntity: (entity: EntityCreate) =>
      client.post("/module/entities", entity),

    updateEntity: (id: string, entity: EntityUpdate) =>
      client.put(`/module/entities/${id}`, entity),

    deleteEntity: (id: string) => client.delete(`/module/entities/${id}`),

    // Add your module-specific methods here
    // Example:
    // customOperation: (id: string, data: any) =>
    //   client.post(`/module/entities/${id}/operation`, data),
  };
}

// ❌ NEVER DO THIS:
// export const moduleApi = {
//   listEntities: async (orgId: string) => {
//     const token = localStorage.getItem("access_token"); // NEVER!
//     // ...
//   }
// };
