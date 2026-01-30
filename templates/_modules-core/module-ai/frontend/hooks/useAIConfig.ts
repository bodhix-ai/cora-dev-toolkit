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
 * Backend now returns camelCase per CORA standard
 */
interface RawDeploymentData {
  id: string;
  providerType: string;
  modelId: string;
  deploymentName: string;
  deploymentStatus: "available" | "testing" | "configured";
  createdAt: string;
  updatedAt: string;
  description?: string;
  displayName?: string;
  capabilities?: string | {
    chat: boolean;
    embedding: boolean;
    vision: boolean;
    streaming: boolean;
    maxTokens: number;
    embeddingDimensions: number;
  };
  metadata?: {
    providerName?: string;
    [key: string]: unknown;
  };
  supportsChat?: boolean;
  supportsEmbeddings?: boolean;
}

export type DeploymentInfo = {
  id: string;
  providerType: string;
  provider: string; // Alias for providerType for easier access
  modelId: string;
  modelName: string; // Alias for modelId for easier access
  deploymentName: string;
  supportsChat: boolean;
  supportsEmbeddings: boolean;
  deploymentStatus: "available" | "testing" | "configured";
  createdAt: string;
  updatedAt: string;
  description?: string;
  capabilities?: {
    chat?: boolean;
    embedding?: boolean;
    vision?: boolean;
    streaming?: boolean;
    maxTokens?: number;
    embeddingDimensions?: number;
    supportsStreaming?: boolean;
    supportsVision?: boolean;
    [key: string]: unknown;
  };
};

export type PlatformAIConfig = {
  defaultEmbeddingModelId: string | null;
  defaultChatModelId: string | null;
  systemPrompt: string;
  embeddingDeployment?: DeploymentInfo;
  chatDeployment?: DeploymentInfo;
};

export type OrgAIConfig = {
  orgId: string;
  orgSystemPrompt: string | null;
  platformConfig: {
    systemPrompt: string;
    defaultChatDeploymentId: string;
    defaultEmbeddingDeploymentId: string;
    chatDeployment?: DeploymentInfo;
    embeddingDeployment?: DeploymentInfo;
  };
  combinedPrompt: string;
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
      const response = await client.get<ApiResponse<PlatformAIConfig>>("/admin/sys/ai/config");

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
      defaultEmbeddingModelId?: string;
      defaultChatModelId?: string;
      systemPrompt?: string;
    }) => {
      setError(null);
      try {
        const token = await authAdapter.getToken();
        if (!token) {
          throw new Error("No authentication token");
        }

        // Only send the fields the backend expects
        const payload: {
          defaultEmbeddingModelId?: string;
          defaultChatModelId?: string;
          systemPrompt?: string;
        } = {};

        if (updates.defaultEmbeddingModelId !== undefined) {
          payload.defaultEmbeddingModelId =
            updates.defaultEmbeddingModelId;
        }
        if (updates.defaultChatModelId !== undefined) {
          payload.defaultChatModelId = updates.defaultChatModelId;
        }
        if (updates.systemPrompt !== undefined) {
          payload.systemPrompt = updates.systemPrompt;
        }

        const client = createCoraAuthenticatedClient(token);
        const data = await client.put<PlatformAIConfig>(
          "/admin/sys/ai/config",
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
    async (updates: { orgSystemPrompt: string | null }) => {
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
      let url = "/admin/sys/ai/models";
      if (capability) {
        url += `?capability=${capability}`;
      }

      // Cast to permissive type for flexible response handling
      const data = await client.get<unknown>(url) as Record<string, unknown> | unknown[];

      // Handle both direct array and wrapped response { success: true, data: [...] }
      let rawList: RawDeploymentData[] = [];

      if (Array.isArray(data)) {
        rawList = data as RawDeploymentData[];
      } else if (data && typeof data === 'object') {
        const dataObj = data as Record<string, unknown>;
        const nestedData = dataObj.data as Record<string, unknown> | unknown[] | undefined;
        
        if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData) && (nestedData as Record<string, unknown>).deployments) {
          // Wrapped response with deployments inside data
          rawList = (nestedData as Record<string, unknown>).deployments as RawDeploymentData[];
        } else if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData) && (nestedData as Record<string, unknown>).models) {
          // Wrapped response with models inside data
          rawList = (nestedData as Record<string, unknown>).models as RawDeploymentData[];
        } else if (Array.isArray(nestedData)) {
          // Wrapped response with array directly in data
          rawList = nestedData as RawDeploymentData[];
        } else if (dataObj.deployments) {
          // Legacy/Direct object with deployments
          rawList = dataObj.deployments as RawDeploymentData[];
        } else if (dataObj.models) {
          // Legacy/Direct object with models
          rawList = dataObj.models as RawDeploymentData[];
        }
      }

      const deploymentList = rawList.map((d: RawDeploymentData) => {
        try {
          const rawCapabilities =
            typeof d.capabilities === "string"
              ? JSON.parse(d.capabilities)
              : d.capabilities;

          // Backend now returns camelCase, normalize legacy snake_case if present
          const capabilities = rawCapabilities
            ? {
                chat: rawCapabilities.chat,
                embedding: rawCapabilities.embedding,
                vision: rawCapabilities.vision,
                supportsStreaming: rawCapabilities.streaming || rawCapabilities.supportsStreaming,
                supportsVision: rawCapabilities.vision || rawCapabilities.supportsVision,
                maxTokens: rawCapabilities.maxTokens || rawCapabilities.max_tokens,
                embeddingDimensions: rawCapabilities.embeddingDimensions || rawCapabilities.embedding_dimensions,
                ...rawCapabilities,
              }
            : null;

          const displayName = d.displayName || "";
          let provider = "Unknown";

          // Try to get provider from metadata first
          if (d.metadata?.providerName) {
            provider = d.metadata.providerName;
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
            providerType: d.providerType,
            provider: provider,
            modelId: d.modelId,
            modelName: modelName,
            deploymentName: d.deploymentName,
            deploymentStatus: d.deploymentStatus,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            description: d.description,
            capabilities: capabilities ?? undefined,
            supportsChat: !!capabilities?.chat,
            supportsEmbeddings: !!capabilities?.embedding,
          };

          return info;
        } catch (e) {
          console.error("Failed to parse model data:", d);
          const errorInfo: DeploymentInfo = {
            id: d.id,
            providerType: d.providerType,
            provider: "Unknown",
            modelId: d.modelId,
            modelName: "Invalid Model",
            deploymentName: d.deploymentName,
            deploymentStatus: d.deploymentStatus,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            description: d.description,
            capabilities: undefined,
            supportsChat: false,
            supportsEmbeddings: false,
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
