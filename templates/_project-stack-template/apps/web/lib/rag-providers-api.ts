/**
 * RAG Multi-Provider API Client
 * Handles platform-level provider management for super admins
 */

import { createApiClient } from "./api-client";

// Get the base URL from environment variables
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "/api" : "");

// Provider Types
export type ProviderType =
  | "openai"
  | "azure_ai_foundry"
  | "anthropic"
  | "aws_bedrock";

export type ModelType = "embedding" | "chat";

// Provider Configuration
export interface ProviderConfig {
  provider_type: ProviderType;
  enabled: boolean;
  api_key?: string;
  api_endpoint?: string;
  organization_id?: string;
  deployment_name?: string;
  api_version?: string;
  region?: string;
  default_model?: string;
  available_models: string[];
  custom_settings: Record<string, any>;
}

// Model Information
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  model_type: ModelType;
  embedding_dimensions?: number;
  max_tokens?: number;
  cost_per_1k_tokens?: number;
  supports_embeddings: boolean;
  supports_chat: boolean;
  description?: string;
}

// Platform RAG Configuration
export interface PlatformRAGConfig {
  id: string;
  provider_configurations: Record<string, ProviderConfig>;
  default_ai_provider: string;
  active_providers: string[];
  created_at?: string;
  updated_at?: string;
}

// Provider Summary
export interface ProviderSummary {
  provider_type: ProviderType;
  name: string;
  enabled: boolean;
  model_count: number;
  embedding_models: number;
  chat_models: number;
  description: string;
  status: "configured" | "not_configured" | "error";
}

// Providers List Response
export interface ProvidersListResponse {
  providers: ProviderSummary[];
  total_providers: number;
  active_providers: number;
  total_models: number;
}

// Models List Response
export interface ModelsListResponse {
  models: ModelInfo[];
  provider_type?: ProviderType;
  model_type?: ModelType;
  total: number;
}

// Connection Test Request
export interface ConnectionTestRequest {
  provider_type: ProviderType;
  configuration: Partial<ProviderConfig>;
}

// Connection Test Response
export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  provider_type: ProviderType;
  available_models?: string[];
  models?: ModelInfo[];
  error?: string;
}

// Update Config Request
export interface UpdatePlatformRAGConfigRequest {
  provider_configurations?: Record<string, ProviderConfig>;
  default_ai_provider?: string;
  active_providers?: string[];
}

/**
 * Get platform RAG configuration (super admin only)
 * @param token The user's JWT for authentication
 * @returns Platform RAG configuration with sanitized API keys
 */
export async function getPlatformRAGConfig(
  token: string
): Promise<PlatformRAGConfig> {
  const client = createApiClient(token);
  return client.get<PlatformRAGConfig>("/admin/rag/config");
}

/**
 * Update platform RAG configuration (super admin only)
 * @param token The user's JWT for authentication
 * @param config Updated configuration
 * @returns Updated platform RAG configuration
 */
export async function updatePlatformRAGConfig(
  token: string,
  config: UpdatePlatformRAGConfigRequest
): Promise<PlatformRAGConfig> {
  const client = createApiClient(token);
  return client.put<PlatformRAGConfig>("/admin/rag/config", config);
}

/**
 * List all available providers with their status and model counts
 * @param token The user's JWT for authentication
 * @returns List of providers with metadata
 */
export async function listProviders(
  token: string
): Promise<ProvidersListResponse> {
  const client = createApiClient(token);
  return client.get<ProvidersListResponse>("/admin/rag/providers");
}

/**
 * Get available models, optionally filtered by provider and model type
 * @param token The user's JWT for authentication
 * @param providerType Optional provider filter
 * @param modelType Optional model type filter (embedding or chat)
 * @returns List of models matching the filters
 */
export async function listModels(
  token: string,
  providerType?: ProviderType,
  modelType?: ModelType
): Promise<ModelsListResponse> {
  let endpoint = "/admin/rag/providers/models";

  const params = new URLSearchParams();
  if (providerType) params.append("provider_type", providerType);
  if (modelType) params.append("model_type", modelType);

  const paramString = params.toString();
  if (paramString) {
    endpoint += `?${paramString}`;
  }

  const client = createApiClient(token);
  return client.get<ModelsListResponse>(endpoint);
}

/**
 * Test a provider connection with the given configuration
 * @param token The user's JWT for authentication
 * @param request Provider type and configuration to test
 * @returns Connection test result
 */
export async function testProviderConnection(
  token: string,
  request: ConnectionTestRequest
): Promise<ConnectionTestResponse> {
  const client = createApiClient(token);
  return client.post<ConnectionTestResponse>("/admin/rag/providers/test", request);
}

// ============================================================================
// Multi-Deployment Management (Azure AI Foundry)
// ============================================================================

export type EndpointType = "project" | "openai" | "serverless_api";
export type DeploymentStatus =
  | "configured"
  | "testing"
  | "available"
  | "failed"
  | "disabled";

export interface ModelDeployment {
  id: string;
  deployment_name: string;
  model_id: string;
  endpoint_url: string;
  endpoint_type: EndpointType;
  api_key: string; // Will be "***" in responses
  api_version?: string;
  deployment_region?: string;
  deployment_status: DeploymentStatus;
  last_tested_at?: string;
  last_test_result?: {
    success: boolean;
    latency_ms?: number;
    embedding_dimensions?: number;
    endpoint_type?: string;
    error?: string;
  };
  supports_embeddings?: boolean;
  supports_chat?: boolean;
  embedding_dimensions?: number;
  max_tokens?: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeploymentsListResponse {
  provider_type: string;
  deployments: ModelDeployment[];
}

export interface TestDeploymentResponse {
  success: boolean;
  deployment_id: string;
  deployment_status: DeploymentStatus;
  test_result?: {
    latency_ms?: number;
    embedding_dimensions?: number;
    endpoint_type?: string;
  };
  error?: string;
  deployment: ModelDeployment;
}

/**
 * List all deployments for a provider
 * @param token The user's JWT for authentication
 * @param providerType The provider type
 * @returns List of deployments
 */
export async function listDeployments(
  token: string,
  providerType: ProviderType
): Promise<DeploymentsListResponse> {
  const client = createApiClient(token);
  return client.get<DeploymentsListResponse>(
    `/admin/rag/providers/${providerType}/deployments`
  );
}

/**
 * Create a new deployment
 * @param token The user's JWT for authentication
 * @param providerType The provider type
 * @param data Deployment configuration
 * @returns Created deployment
 */
export async function createDeployment(
  token: string,
  providerType: ProviderType,
  data: {
    deployment_name: string;
    model_id: string;
    endpoint_url: string;
    api_key: string;
    api_version?: string;
    deployment_region?: string;
    endpoint_type?: EndpointType;
  }
): Promise<ModelDeployment> {
  const client = createApiClient(token);
  return client.post<ModelDeployment>(
    `/admin/rag/providers/${providerType}/deployments`,
    data
  );
}

/**
 * Update an existing deployment
 * @param token The user's JWT for authentication
 * @param providerType The provider type
 * @param deploymentId The deployment ID
 * @param data Updated configuration
 * @returns Updated deployment
 */
export async function updateDeployment(
  token: string,
  providerType: ProviderType,
  deploymentId: string,
  data: Partial<{
    deployment_name: string;
    api_key: string;
    endpoint_url: string;
    api_version: string;
    deployment_status: DeploymentStatus;
  }>
): Promise<ModelDeployment> {
  const client = createApiClient(token);
  return client.put<ModelDeployment>(
    `/admin/rag/providers/${providerType}/deployments/${deploymentId}`,
    data
  );
}

/**
 * Test a deployment
 * @param token The user's JWT for authentication
 * @param providerType The provider type
 * @param deploymentId The deployment ID
 * @returns Test result
 */
export async function testDeployment(
  token: string,
  providerType: ProviderType,
  deploymentId: string
): Promise<TestDeploymentResponse> {
  const response = await fetch(
    `${API_BASE}/admin/rag/providers/${providerType}/deployments/${deploymentId}/test`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Note: Test can return 400 with failure details
  const data = await response.json();

  if (!response.ok && response.status !== 400) {
    throw new Error(data.error || "Failed to test deployment");
  }

  return data;
}

/**
 * Delete a deployment
 * @param token The user's JWT for authentication
 * @param providerType The provider type
 * @param deploymentId The deployment ID
 * @returns Success message
 */
export async function deleteDeployment(
  token: string,
  providerType: ProviderType,
  deploymentId: string
): Promise<{ success: boolean; message: string }> {
  const client = createApiClient(token);
  return client.delete<{ success: boolean; message: string }>(
    `/admin/rag/providers/${providerType}/deployments/${deploymentId}`
  );
}
