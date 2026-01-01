"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createCoraAuthenticatedClient,
  type CoraAuthAdapter,
} from "@{{PROJECT_NAME}}/api-client";
import { createAIEnablementClient } from "../lib/api";
import { AIProvider } from "../types";

/**
 * Hook for managing AI Providers (platform-level)
 * Requires admin role (super_admin, global_owner, or global_admin)
 *
 * @param authAdapter - CORA authentication adapter (IdP-agnostic)
 * @example
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapter } from '@{{PROJECT_NAME}}/api-client';
 * import { useProviders } from '@{{PROJECT_NAME}}/ai-enablement-module';
 *
 * const clerkAuth = useAuth();
 * const authAdapter = createClerkAuthAdapter(clerkAuth);
 * const { providers } = useProviders(authAdapter);
 * ```
 */
export function useProviders(authAdapter: CoraAuthAdapter) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState<string | null>(null);
  const [api, setApi] = useState<ReturnType<
    typeof createAIEnablementClient
  > | null>(null);

  // Initialize API client when auth adapter changes
  useEffect(() => {
    const initializeApi = async () => {
      const token = await authAdapter.getToken();
      if (token) {
        setApi(createAIEnablementClient(createCoraAuthenticatedClient(token)));
      } else {
        setApi(null);
      }
    };
    initializeApi();
  }, [authAdapter]);

  const fetchProviders = useCallback(async () => {
    if (!api) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.getProviders();
      console.log("DEBUG: API response:", response);
      console.log("DEBUG: response.success:", response.success);
      console.log("DEBUG: response.data:", response.data);
      if (response.success) {
        setProviders(response.data);
      } else {
        console.error(
          "DEBUG: API returned success=false, error:",
          response.error
        );
        setError(response.error || "Failed to fetch providers");
      }
    } catch (err) {
      console.error("DEBUG: Exception caught:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch providers"
      );
      console.error("Error fetching providers:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const createProvider = useCallback(
    async (data: {
      name: string;
      displayName?: string;
      providerType: "aws_bedrock" | "azure_openai" | "openai";
      credentialsSecretPath?: string;
      isActive?: boolean;
    }) => {
      if (!api) return null;

      setError(null);
      try {
        const response = await api.createProvider(data);
        if (response.success) {
          setProviders((prev) => [...prev, response.data]);
          return response.data;
        } else {
          setError(response.error || "Failed to create provider");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create provider"
        );
        console.error("Error creating provider:", err);
        return null;
      }
    },
    [api]
  );

  const updateProvider = useCallback(
    async (
      id: string,
      data: {
        displayName?: string;
        credentialsSecretPath?: string;
        isActive?: boolean;
      }
    ) => {
      if (!api) return null;

      setError(null);
      try {
        const response = await api.updateProvider(id, data);
        if (response.success) {
          setProviders((prev) =>
            prev.map((p) => (p.id === id ? response.data : p))
          );
          return response.data;
        } else {
          setError(response.error || "Failed to update provider");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update provider"
        );
        console.error("Error updating provider:", err);
        return null;
      }
    },
    [api]
  );

  const deleteProvider = useCallback(
    async (id: string) => {
      if (!api) return false;

      setError(null);
      try {
        const response = await api.deleteProvider(id);
        if (response.success) {
          setProviders((prev) => prev.filter((p) => p.id !== id));
          return true;
        } else {
          setError(response.error || "Failed to delete provider");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete provider"
        );
        console.error("Error deleting provider:", err);
        return false;
      }
    },
    [api]
  );

  const discoverModels = useCallback(
    async (providerId: string) => {
      if (!api) return null;

      setDiscoveryLoading(providerId);
      setError(null);
      try {
        const response = await api.discoverModels(providerId);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || "Failed to discover models");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to discover models"
        );
        console.error("Error discovering models:", err);
        return null;
      } finally {
        setDiscoveryLoading(null);
      }
    },
    [api]
  );

  const getModels = useCallback(
    async (providerId: string) => {
      if (!api) return [];

      setError(null);
      try {
        const response = await api.getModels(providerId);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || "Failed to get models");
          return [];
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get models");
        console.error("Error getting models:", err);
        return [];
      }
    },
    [api]
  );

  const testModel = useCallback(
    async (modelId: string, prompt?: string) => {
      if (!api) return null;

      setError(null);
      try {
        const testInput = {
          prompt:
            prompt || "Hello, this is a test message. Please respond briefly.",
        };
        const response = await api.testModel(modelId, testInput);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || "Failed to test model");
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to test model");
        console.error("Error testing model:", err);
        return null;
      }
    },
    [api]
  );

  return {
    providers,
    loading,
    error,
    discoveryLoading,
    refetch: fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    discoverModels,
    getModels,
    testModel,
  };
}
