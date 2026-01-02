"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createCoraAuthenticatedClient,
  type CoraAuthAdapter,
} from "@{{PROJECT_NAME}}/api-client";

// Types for AI Configuration

/**
 * API response wrapper type - handles both wrapped and unwrapped responses
 */
type ApiResponse<T> = T | { success: boolean; data: T };

/**
 * Raw deployment data from API before processing
 */
interface RawDeploymentData {
  id: string;
  provider_type: string;
  model_id: string;
  deployment_name: string;
  deployment_status: "available" | "testing" | "configured";
  created_at: string;
  updated_at: string;
  description?: string;
  display_name?: string;
  capabilities?: string | {
    chat: boolean;
    embedding: boolean;
    vision: boolean;
    streaming: boolean;
    max_tokens: number;
    embedding_dimensions: number;
  };
  metadata?: {
    provider_name?: string;
    // @ts-expect-error - Dynamic metadata fields from various providers
    [key: string]: unknown;
  };
  supports_chat?: boolean;
  supports_embeddings?: boolean;
}

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
    chat?: boolean;
    embedding?: boolean;
    vision?: boolean;
    streaming?: boolean;
    max_tokens?: number;
    embedding_dimensions?: number;
    supportsStreaming?: boolean;
    supportsVision?: boolean;
    maxTokens?: number;
    embeddingDimensions?: number;
    // @ts-expect-error - Additional capability fields from various providers
    [key: string]: unknown;
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
 * import { createClerkAuthAdapter } from '@ai-sec/api-client';
 * import { usePlatformAIConfig } from '@ai-sec/ai-config-module';
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
      const response = await client.get<ApiResponse<PlatformAIConfig>>("/admin/ai/config");

      // Handle wrapped response { success: true, data: {...} }
      const data = (response as { success: boolean; data: PlatformAIConfig })?.success && 
                   (response as { success: boolean; data: PlatformAIConfig })?.data 
                   ? (response as { success: boolean; data: PlatformAIConfig }).data 
                   : response as PlatformAIConfig;

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
      const response = await client.get<ApiResponse<OrgAIConfig>>(
        `/orgs/${orgId}/ai/config`
      );

      // Handle wrapped response { success: true, data: {...} }
      const data = (response as { success: boolean; data: OrgAIConfig })?.success && 
                   (response as { success: boolean; data: OrgAIConfig })?.data 
                   ? (response as { success: boolean; data: OrgAIConfig }).data 
                   : response as OrgAIConfig;

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

      const data = await client.get<unknown>(url);

      // Handle both direct array and wrapped response { success: true, data: [...] }
      let rawList: RawDeploymentData[] = [];

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

      const deploymentList = rawList.map((d: RawDeploymentData) => {
        try {
          const rawCapabilities =
            typeof d.capabilities === "string"
              ? JSON.parse(d.capabilities)
              : d.capabilities;

          // Transform capabilities to camelCase for compatibility with AIModel
          const capabilities = rawCapabilities
            ? {
                chat: rawCapabilities.chat,
                embedding: rawCapabilities.embedding,
                vision: rawCapabilities.vision,
                supportsStreaming: rawCapabilities.streaming, // Map to camelCase
                supportsVision: rawCapabilities.vision, // Map to camelCase
                maxTokens: rawCapabilities.max_tokens, // Map to camelCase
                embeddingDimensions: rawCapabilities.embedding_dimensions, // Map to camelCase
                ...rawCapabilities,
              }
            : null;

          const displayName = d.display_name || "";
          let provider = "Unknown";

          // Try to get provider from metadata first
          if (d.metadata?.provider_name) {
            provider = d.metadata.provider_name;
          } else {
            // Fallback to regex on display name
            const providerMatch = displayName.match(/\(([^)]+)\)$/);
            const extracted = providerMatch ? providerMatch[1] : "Unknown";

            // Refine provider name if generic
            if (
              extracted === "Inference Profile" ||
              extracted === "Bedrock" ||
              extracted === "Unknown"
            ) {
              const lowerName = displayName.toLowerCase();
              if (lowerName.includes("anthropic") || lowerName.includes("claude"))
                provider = "Anthropic";
              else if (lowerName.includes("meta") || lowerName.includes("llama"))
                provider = "Meta";
              else if (
                lowerName.includes("amazon") ||
                lowerName.includes("titan") ||
                lowerName.includes("nova")
              )
                provider = "Amazon";
              else if (
                lowerName.includes("mistral") ||
                lowerName.includes("mixtral")
              )
                provider = "Mistral AI";
              else if (
                lowerName.includes("cohere") ||
                lowerName.includes("command")
              )
                provider = "Cohere";
              else if (
                lowerName.includes("stability") ||
                lowerName.includes("stable")
              )
                provider = "Stability AI";
              else if (
                lowerName.includes("ai21") ||
                lowerName.includes("jamba") ||
                lowerName.includes("jurassic")
              )
                provider = "AI21 Labs";
              else if (extracted === "Bedrock") provider = "Amazon Bedrock";
              else provider = extracted;
            } else {
              provider = extracted;
            }
          }

          // Clean model name
          const modelName = displayName.replace(/\s*\([^)]+\)$/, "").trim();

          // Construct DeploymentInfo explicitly to avoid spread type issues
          const info: DeploymentInfo = {
            id: d.id,
            provider_type: d.provider_type,
            provider: provider,
            model_id: d.model_id,
            model_name: modelName,
            deployment_name: d.deployment_name,
            deployment_status: d.deployment_status,
            created_at: d.created_at,
            updated_at: d.updated_at,
            description: d.description,
            capabilities: capabilities ?? undefined,
            supports_chat: !!capabilities?.chat,
            supports_embeddings: !!capabilities?.embedding,
          };

          return info;
        } catch (e) {
          console.error("Failed to parse model data:", d);
          const errorInfo: DeploymentInfo = {
            id: d.id,
            provider_type: d.provider_type,
            provider: "Unknown",
            model_id: d.model_id,
            model_name: "Invalid Model",
            deployment_name: d.deployment_name,
            deployment_status: d.deployment_status,
            created_at: d.created_at,
            updated_at: d.updated_at,
            description: d.description,
            capabilities: undefined,
            supports_chat: false,
            supports_embeddings: false,
          };
          return errorInfo;
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
