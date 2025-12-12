"use client";

import { useState, useCallback, useEffect } from "react";
import { createAuthenticatedClient } from "@${project}/api-client";
import { useUser } from "../contexts/UserContext";
import { createOrgModuleClient } from "../lib/api";
import { Organization } from "../types";

/**
 * Hook for fetching the list of organizations for the current user.
 */
export function useOrganizations() {
  const { isAuthenticated, authAdapter } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated || !authAdapter) {
      setOrganizations([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await authAdapter.getToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }
      const client = createAuthenticatedClient(token);
      const api = createOrgModuleClient(client);

      const response = await api.getOrganizations();
      if (response.success) {
        setOrganizations(response.data);
      } else {
        setError(response.error || "Failed to fetch organizations");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch organizations"
      );
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authAdapter]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
  };
}
