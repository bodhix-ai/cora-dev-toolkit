import useSWR from "swr";
import type { AuthenticatedClient } from "@sts-career/api-client";
import { useOrganizationContext } from "../../../org-module/frontend/hooks/useOrganizationContext";
import { createModuleClient } from "../lib/api";
import type { ModuleEntity } from "../types";

/**
 * A hook to fetch module data.
 *
 * This hook demonstrates the correct pattern for data fetching in CORA modules:
 * 1. It accepts an `AuthenticatedClient` instance as a parameter.
 * 2. It does NOT create its own client or use `useSession`.
 * 3. The page-level component is responsible for providing the client.
 * 4. It uses `useOrganizationContext` to get the organization ID.
 *
 * @param client The authenticated API client.
 * @returns The SWR response with data, error, and loading state.
 */
export function useModuleData(client: AuthenticatedClient | null) {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.orgId ?? null;
  // Only fetch data if the client and orgId are available.
  const shouldFetch = client && orgId;

  const { data, error, isLoading } = useSWR<ModuleEntity[], Error>(
    // The SWR key is typically the API endpoint. It's set to null if we shouldn't fetch.
    shouldFetch ? ["/module/entities", orgId] : null,
    // The fetcher function uses the provided client to make the API call.
    () => {
      if (!client || !orgId) {
        // This should not happen due to the `shouldFetch` check, but it's good practice
        // to handle this case for type safety.
        throw new Error(
          "Authenticated client or organization ID is not available.",
        );
      }
      // Create a module-specific API client from the authenticated client.
      const moduleClient = createModuleClient(client);
      return moduleClient.listEntities(orgId);
    },
  );

  return {
    data,
    error,
    isLoading,
  };
}
