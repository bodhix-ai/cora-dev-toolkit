"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createCoraAuthenticatedClient,
  type CoraAuthAdapter,
} from "@${project}/api-client";
import { createAIEnablementClient } from "../lib/api";
import { AIModel, TestModelInput, TestModelResponse } from "../types";

/**
 * Hook for managing AI Models (platform-level)
 * Requires admin role (super_admin, global_owner, or global_admin)
 *
 * @param authAdapter - CORA authentication adapter (IdP-agnostic)
 * @param providerId - Optional provider ID to filter models
 * @example
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapter } from '@${project}/api-client';
 * import { useModels } from '@${project}/ai-enablement-module';
 *
 * const clerkAuth = useAuth();
 * const authAdapter = createClerkAuthAdapter(clerkAuth);
 * const { models } = useModels(authAdapter, providerId);
 * ```
 */
export function useModels(authAdapter: CoraAuthAdapter, providerId?: string) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [api, setApi] = useState<ReturnType<
    typeof createAIEnablementClient
  > | null>(null);

  // Initialize API client and fetch models when auth adapter or providerId changes
  useEffect(() => {
    const initializeAndFetch = async () => {
      const token = await authAdapter.getToken();
      if (token) {
        const newApi = createAIEnablementClient(
          createCoraAuthenticatedClient(token)
        );
        setApi(newApi);

        // Fetch models immediately if providerId exists
        if (providerId) {
          setLoading(true);
          setError(null);
          try {
            const response = await newApi.getModels(providerId);
            if (response.success) {
              setModels(response.data);
            } else {
              setError(response.error || "Failed to fetch models");
            }
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to fetch models"
            );
            console.error("Error fetching models:", err);
          } finally {
            setLoading(false);
          }
        }
      } else {
        setApi(null);
      }
    };
    initializeAndFetch();
  }, [authAdapter, providerId]);

  const fetchModels = useCallback(async () => {
    if (!api || !providerId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.getModels(providerId);
      if (response.success) {
        setModels(response.data);
      } else {
        setError(response.error || "Failed to fetch models");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch models");
      console.error("Error fetching models:", err);
    } finally {
      setLoading(false);
    }
  }, [api, providerId]);

  const discoverModels = useCallback(
    async (targetProviderId: string) => {
      if (!api) return null;

      setDiscovering(true);
      setError(null);
      try {
        const response = await api.discoverModels(targetProviderId);
        if (response.success) {
          // Refresh the models list if we're viewing this provider
          if (targetProviderId === providerId) {
            setModels(response.data.models);
          }
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
        setDiscovering(false);
      }
    },
    [api, providerId]
  );

  const validateModels = useCallback(
    (
      targetProviderId: string,
      onProgress?: (progress: {
        isValidating?: boolean;
        validated: number;
        total: number;
        available: number;
        unavailable: number;
        currentModel?: string;
      }) => void
    ): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        if (!api) {
          return reject(new Error("API client not initialized"));
        }

        setError(null);
        try {
          // Start validation (returns 202 Accepted)
          const initialResponse = await api.validateModels(targetProviderId);

          if (!initialResponse.success) {
            const errorMsg =
              initialResponse.error || "Failed to start model validation";
            setError(errorMsg);
            return reject(new Error(errorMsg));
          }

          // Start polling for progress
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse =
                await api.getValidationStatus(targetProviderId);

              if (statusResponse.success) {
                const progress = statusResponse.data;

                // Update progress via callback
                onProgress?.({
                  isValidating: progress.isValidating,
                  validated: progress.validated,
                  total: progress.total,
                  available: progress.available,
                  unavailable: progress.unavailable,
                  currentModel: progress.currentModel,
                });

                // If polling is done, clean up and resolve
                if (!progress.isValidating) {
                  clearInterval(pollInterval);

                  // Refresh local models if they are for the same provider
                  if (targetProviderId === providerId) {
                    await fetchModels();
                  }
                  resolve();
                }
              } else {
                // Stop polling on status fetch failure
                clearInterval(pollInterval);
                const errorMsg =
                  statusResponse.error || "Failed to get validation status";
                setError(errorMsg);
                reject(new Error(errorMsg));
              }
            } catch (err) {
              clearInterval(pollInterval);
              const errorMsg =
                err instanceof Error
                  ? err.message
                  : "Polling failed unexpectedly";
              setError(errorMsg);
              console.error("Error polling validation status:", err);
              reject(new Error(errorMsg));
            }
          }, 2000); // Poll every 2 seconds
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to validate models";
          setError(errorMsg);
          console.error("Error validating models:", err);
          reject(new Error(errorMsg));
        }
      });
    },
    [api, providerId, fetchModels]
  );

  const testModel = useCallback(
    async (
      modelId: string,
      data: TestModelInput
    ): Promise<TestModelResponse | null> => {
      if (!api) return null;

      setTesting(modelId);
      setError(null);
      try {
        const response = await api.testModel(modelId, data);
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
      } finally {
        setTesting(null);
      }
    },
    [api]
  );

  return {
    models,
    loading,
    error,
    discovering,
    testing,
    refetch: fetchModels,
    discoverModels,
    validateModels,
    testModel,
  };
}
