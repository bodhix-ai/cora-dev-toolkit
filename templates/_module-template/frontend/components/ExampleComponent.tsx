"use client";

import { useSession } from "next-auth/react";
import { createAuthenticatedClient } from "@sts-career/api-client";
import { useModuleData } from "../hooks/useModuleData";
import type { ModuleEntity } from "../types";

/**
 * An example component demonstrating the correct pattern for fetching data.
 *
 * This component is responsible for:
 * 1. Using the `useSession` hook to get the user's session and access token.
 * 2. Creating an `AuthenticatedClient` instance.
 * 3. Passing the client down to the data-fetching hook (`useModuleData`).
 * 4. Handling loading and error states.
 *
 * This pattern ensures that data-fetching logic is decoupled from session management,
 * making hooks more reusable and pages the single source of truth for authentication state.
 */
export function ExampleComponent({ orgId }: { orgId: string }) {
  // 1. Get the session at the page/component level.
  const { data: session, status } = useSession();

  // 2. Create the authenticated client.
  // It will be null if the session is loading or not available.
  const apiClient = session?.accessToken
    ? createAuthenticatedClient(session.accessToken)
    : null;

  // 3. Pass the client and other parameters to the hook.
  const { data: entities, error, isLoading } = useModuleData(apiClient, orgId);

  // 4. Handle loading and error states.
  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please sign in to view this content.</div>;
  }

  return (
    <div>
      <h2>Module Data</h2>
      {entities && entities.length > 0 ? (
        <ul>
          {entities.map((entity: ModuleEntity) => (
            <li key={entity.id}>
              <strong>{entity.name}</strong>: {entity.description}
            </li>
          ))}
        </ul>
      ) : (
        <p>No entities found for this organization.</p>
      )}
    </div>
  );
}
