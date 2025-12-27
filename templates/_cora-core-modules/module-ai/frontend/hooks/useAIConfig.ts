"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createCoraAuthenticatedClient,
  type CoraAuthAdapter,
} from "@{{PROJECT_NAME}}/api-client";

// Types for AI Configuration
export type DeploymentInfo = {
  id: string;
  provider_type: string;
  provider: string; // Alias for provider_type for easier access
  model_id: string;
  model_name: string; // Alias for model_id for easier access
  deployment_name: string;
  supports_chat: boolean;
  supports_embeddings: boolean;
  deployment_status: "available" | "testing" | "configured";
  created_at: string;
  updated_at: string;
  description?: string;
  capabilities?: {
    chat: boolean;
    embedding: boolean;
    vision: boolean;
    streaming: boolean;
    max_tokens: number;
    embedding_dimensions: number;
  };
};

export type PlatformAIConfig = {
  default_embedding_model_id: string | null;
  default_chat_model_id: string | null;
  system_prompt: string;
  embedding_deployment?: DeploymentInfo;
  chat_deployment?: DeploymentInfo;
};

export type OrgAIConfig = {
  org_id: string;
  org_system_prompt: string | null;
  platform_config: {
    system_prompt: string;
    default_chat_deployment_id: string;
    default_embedding_deployment_id: string;
    chat_deployment?: DeploymentInfo;
    embedding_deployment?: DeploymentInfo;
  };
  combined_prompt: string;
};

/**
 * Hook to fetch and update platform AI configuration (super admin only)
 * Uses CORA auth adapter for IdP-agnostic authentication
 *
 * @param authAdapter - CORA authentication adapter
 * @example
 * ```tsx
 * import { useAuth } from '@clerk/nextjs';
 * import { createClerkAuthAdapter } from '@{{PROJECT_NAME}}/api-client';
 * import { usePlatformAIConfig } from '@{{PROJECT_NAME}}/ai-config-module';
 *
 * const clerkAuth = useAuth();
 * const authAdapter = createClerkAuthAdapter(clerkAuth);
 * const { config } = usePlatformAIConfig(authAdapter);
 * ```
 */
export function usePlatformAIConfig(authAdapter: CoraAuthAdapter) {
  const [config, setConfig] = useState<PlatformAIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("No authentication token");
        setIsLoading(false);
        return;
      }

      const client = createCoraAuthenticatedClient(token);
      const response: any =
        await client.get<PlatformAIConfig>("/admin/ai/config");

      // Handle wrapped response { success: true, data: {...} }
      const data =
        response?.success && response?.data ? response.data : response;

      setConfig(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch platform AI config";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [authAdapter]);

  const updateConfig = useCallback(
    async (updates: {
      default_embedding_model_id?: string;
      default_chat_model_id?: string;
      system_prompt?: string;
    }) => {
      setError(null);
      try {
        const token = await authAdapter.getToken();
        if (!token) {
          throw new Error("No authentication token");
        }

        // Only send the fields the backend expects
        const payload: {
          default_embedding_model_id?: string;
          default_chat_model_id?: string;
          system_prompt?: string;
        } = {};

        if (updates.default_embedding_model_id !== undefined) {
          payload.default_embedding_model_id =
            updates.default_embedding_model_id;
        }
        if (updates.default_chat_model_id !== undefined) {
          payload.default_chat_model_id = updates.default_chat_model_id;
        }
        if (updates.system_prompt !== undefined) {
          payload.system_prompt = updates.system_prompt;
        }

        const client = createCoraAuthenticatedClient(token);
        const data = await client.put<PlatformAIConfig>(
          "/admin/ai/config",
          payload
        );
        setConfig(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update platform AI config";
        setError(errorMessage);
        throw err;
      }
    },
    [authAdapter]
  );

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, isLoading, error, refetch: fetchConfig, updateConfig };
}

/**
 * Hook to fetch and update organization AI configuration
 * Uses CORA auth adapter for IdP-agnostic authentication
 *
 * @param authAdapter - CORA authentication adapter
 * @param orgId - Organization ID
 */
export function useOrgAIConfig(authAdapter: CoraAuthAdapter, orgId: string) {
  const [config, setConfig] = useState<OrgAIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!orgId) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("No authentication token");
        setIsLoading(false);
        return;
      }

      const client = createCoraAuthenticatedClient(token, orgId);
      const response: any = await client.get<OrgAIConfig>(
        `/orgs/${orgId}/ai/config`
      );

      // Handle wrapped response { success: true, data: {...} }
      const data =
        response?.success && response?.data ? response.data : response;

      setConfig(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch org AI config";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [authAdapter, orgId]);

  const updateConfig = useCallback(
    async (updates: { org_system_prompt: string | null }) => {
      if (!orgId) throw new Error("Organization ID is required");

      setError(null);
      try {
        const token = await authAdapter.getToken();
        if (!token) {
          throw new Error("No authentication token");
        }

        const client = createCoraAuthenticatedClient(token, orgId);
        const data = await client.put<OrgAIConfig>(
          `/orgs/${orgId}/ai/config`,
          updates
        );
        setConfig(data);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update org AI config";
        setError(errorMessage);
        throw err;
      }
    },
    [authAdapter, orgId]
  );

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, isLoading, error, refetch: fetchConfig, updateConfig };
}

/**
 * Hook to fetch available deployments
 * Uses CORA auth adapter for IdP-agnostic authentication
 *
 * @param authAdapter - CORA authentication adapter
 * @param capability - Optional filter by capability (chat or embeddings)
 */
export function useDeployments(
  authAdapter: CoraAuthAdapter,
  capability?: "chat" | "embeddings"
) {
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeployments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("No authentication token");
        setIsLoading(false);
        return;
      }

      const client = createCoraAuthenticatedClient(token);
      let url = "/admin/ai/models";
      if (capability) {
        url += `?capability=${capability}`;
      }

      const data: any = await client.get<
        | { deployments?: DeploymentInfo[]; models?: DeploymentInfo[] }
        | DeploymentInfo[]
      >(url);

      // Handle both direct array and wrapped response { success: true, data: [...] }
      let rawList: any[] = [];

      if (Array.isArray(data)) {
        rawList = data;
      } else if (data?.data?.deployments) {
        // Wrapped response with deployments inside data
        rawList = data.data.deployments;
      } else if (data?.data?.models) {
        // Wrapped response with models inside data
        rawList = data.data.models;
      } else if (Array.isArray(data?.data)) {
        // Wrapped response with array directly in data
        rawList = data.data;
      } else if (data?.deployments) {
        // Legacy/Direct object with deployments
        rawList = data.deployments;
      } else if (data?.models) {
        // Legacy/Direct object with models
        rawList = data.models;
      }

      const deploymentList = rawList.map((d: any) => {
        try {
          const capabilities =
            typeof d.capabilities === "string"
              ? JSON.parse(d.capabilities)
              : d.capabilities;

          const displayName = d.display_name || "";
          const providerMatch = displayName.match(/\(([^)]+)\)/);
          const provider = providerMatch ? providerMatch[1] : "Unknown";
          const modelName = displayName.replace(/\s*\([^)]+\)/, "").trim();

          return {
            ...d,
            model_name: modelName,
            provider: provider,
            capabilities: capabilities,
            supports_chat: !!capabilities?.chat,
            supports_embeddings: !!capabilities?.embedding,
          };
        } catch (e) {
          console.error("Failed to parse model data:", d);
          return {
            ...d,
            model_name: "Invalid Model",
            provider: "Unknown",
            supports_chat: false,
            supports_embeddings: false,
          };
        }
      });

      console.log("[useDeployments] Raw API response:", data);
      console.log(
        "[useDeployments] Processed deployment list:",
        deploymentList
      );
      console.log(
        "[useDeployments] Processed deployment count:",
        deploymentList.length
      );
      setDeployments(deploymentList);
      return deploymentList;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch deployments";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [authAdapter, capability]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  return { deployments, isLoading, error, refetch: fetchDeployments };
}
