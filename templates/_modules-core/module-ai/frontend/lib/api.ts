import {
  ApiResponse,
  AIProvider,
  AIModel,
  CreateProviderInput,
  UpdateProviderInput,
  TestModelInput,
  TestModelResponse,
  DiscoverModelsResponse,
  ValidateModelsResponse,
  ValidationProgress,
  ModelStatus,
  ValidationCategory,
  ModelCapabilities,
} from "../types";

/**
 * API response interfaces (snake_case from backend)
 */
interface ProviderApiData {
  id: string;
  name: string;
  display_name?: string | null;
  provider_type: string;
  auth_method?: string | null;
  credentials_secret_path?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  model_counts?: {
    total?: number;
    discovered?: number;
    testing?: number;
    available?: number;
    unavailable?: number;
    deprecated?: number;
    by_category?: Record<string, number>;
  };
  last_validated_at?: string | null;
}

interface ModelApiData {
  id: string;
  provider_id: string;
  model_id: string;
  display_name?: string | null;
  capabilities?: ModelCapabilities | null;
  status?: ModelStatus;
  validation_category?: ValidationCategory | null;
  cost_per_1k_tokens_input?: number | null;
  cost_per_1k_tokens_output?: number | null;
  last_discovered_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

interface ProviderInputApiData {
  name?: string;
  display_name?: string;
  provider_type?: string;
  auth_method?: string;
  credentials_secret_path?: string;
  is_active?: boolean;
}

/**
 * Authenticated client interface
 */
interface AuthenticatedClient {
  get: <T = unknown>(url: string) => Promise<ApiResponse<T>>;
  post: <T = unknown>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  put: <T = unknown>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  delete: <T = unknown>(url: string) => Promise<ApiResponse<T>>;
}

/**
 * Transform snake_case API response to camelCase frontend types
 * Note: org_id removed as providers/models are now platform-level
 */
function transformProviderResponse(apiData: ProviderApiData): AIProvider {
  return {
    id: apiData.id,
    name: apiData.name,
    displayName: apiData.display_name || null,
    providerType: apiData.provider_type,
    authMethod: (apiData.auth_method as 'iam_role' | 'secrets_manager' | 'ssm_parameter') || 'secrets_manager',
    credentialsSecretPath: apiData.credentials_secret_path || null,
    isActive: apiData.is_active ?? true,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
    createdBy: apiData.created_by || null,
    updatedBy: apiData.updated_by || null,
    modelCounts: apiData.model_counts
      ? {
          total: apiData.model_counts.total || 0,
          discovered: apiData.model_counts.discovered || 0,
          testing: apiData.model_counts.testing || 0,
          available: apiData.model_counts.available || 0,
          unavailable: apiData.model_counts.unavailable || 0,
          deprecated: apiData.model_counts.deprecated || 0,
          by_category: apiData.model_counts.by_category || undefined,
        }
      : undefined,
    lastValidatedAt: apiData.last_validated_at || null,
  };
}

function transformModelResponse(apiData: ModelApiData): AIModel {
  // Transform capabilities keys from snake_case (backend) to camelCase (frontend)
  let capabilities: ModelCapabilities | null = null;
  if (apiData.capabilities) {
    // Handle stringified capabilities (legacy data) or object (new data)
    const caps = typeof apiData.capabilities === 'string' 
      ? JSON.parse(apiData.capabilities) 
      : apiData.capabilities as any;
      
    capabilities = {
      chat: caps.chat,
      embedding: caps.embedding,
      maxTokens: caps.max_tokens,
      supportsStreaming: caps.streaming,
      supportsVision: caps.vision,
      embeddingDimensions: caps.embedding_dimensions,
      ...caps, // Keep other properties
    };
  }

  return {
    id: apiData.id,
    providerId: apiData.provider_id,
    modelId: apiData.model_id,
    displayName: apiData.display_name || null,
    description: (apiData as any).description || null, // Ensure description is mapped
    capabilities,
    status: apiData.status || "available",
    validationCategory: apiData.validation_category || null,
    costPer1kTokensInput: apiData.cost_per_1k_tokens_input || null,
    costPer1kTokensOutput: apiData.cost_per_1k_tokens_output || null,
    lastDiscoveredAt: apiData.last_discovered_at || null,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
    createdBy: apiData.created_by || null,
    updatedBy: apiData.updated_by || null,
  };
}

/**
 * Transform camelCase frontend input to snake_case API request
 */
function transformProviderInput(
  input: CreateProviderInput | UpdateProviderInput
): ProviderInputApiData {
  const result: ProviderInputApiData = {};

  if ("name" in input) result.name = input.name;
  if ("displayName" in input) result.display_name = input.displayName;
  if ("providerType" in input) result.provider_type = input.providerType;
  if ("authMethod" in input) result.auth_method = input.authMethod;
  if ("credentialsSecretPath" in input)
    result.credentials_secret_path = input.credentialsSecretPath;
  if ("isActive" in input) result.is_active = input.isActive;

  return result;
}

export interface AIEnablementApiClient {
  // Provider endpoints (platform-level, no org_id needed)
  getProviders: () => Promise<ApiResponse<AIProvider[]>>;
  getProvider: (id: string) => Promise<ApiResponse<AIProvider>>;
  createProvider: (
    data: CreateProviderInput
  ) => Promise<ApiResponse<AIProvider>>;
  updateProvider: (
    id: string,
    data: UpdateProviderInput
  ) => Promise<ApiResponse<AIProvider>>;
  deleteProvider: (id: string) => Promise<ApiResponse<void>>;

  // Model discovery endpoints
  discoverModels: (
    providerId: string
  ) => Promise<ApiResponse<DiscoverModelsResponse>>;
  validateModels: (
    providerId: string
  ) => Promise<ApiResponse<ValidateModelsResponse>>;
  getValidationStatus: (
    providerId: string
  ) => Promise<ApiResponse<ValidationProgress>>;

  // Model endpoints
  getModels: (providerId?: string) => Promise<ApiResponse<AIModel[]>>;
  getModel: (id: string) => Promise<ApiResponse<AIModel>>;
  testModel: (
    id: string,
    data: TestModelInput
  ) => Promise<ApiResponse<TestModelResponse>>;
}

/**
 * Factory function to create AI enablement module API client
 * Platform-level operations - requires admin role (super_admin, global_owner, global_admin)
 * @param authenticatedClient - CORA authenticated client instance
 * @returns AIEnablementApiClient
 */
export function createAIEnablementClient(
  authenticatedClient: AuthenticatedClient
): AIEnablementApiClient {
  return {
    // Provider operations
    getProviders: async () => {
      try {
        // authenticatedClient returns raw API response
        // Backend returns { success: true, data: [...] }
        const response = await authenticatedClient.get<ProviderApiData[] | { data: ProviderApiData[] }>(`/providers`);
        const providers = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];

        return {
          success: true,
          data: providers.map(transformProviderResponse),
        };
      } catch (error) {
        return {
          success: false,
          data: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch providers",
        };
      }
    },

    getProvider: async (id: string) => {
      const response = await authenticatedClient.get<ProviderApiData>(`/providers/${id}`);
      if (response.success && response.data) {
        const transformed = transformProviderResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as AIProvider, error: response.error };
    },

    createProvider: async (data: CreateProviderInput) => {
      const payload = transformProviderInput(data);
      const response = await authenticatedClient.post<ProviderApiData>(`/providers`, payload);
      if (response.success && response.data) {
        const transformed = transformProviderResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as AIProvider, error: response.error };
    },

    updateProvider: async (id: string, data: UpdateProviderInput) => {
      try {
        const payload = transformProviderInput(data);
        const response = await authenticatedClient.put<ProviderApiData>(
          `/providers/${id}`,
          payload
        );
        if (response.success && response.data) {
          const transformed = transformProviderResponse(response.data);
          return { success: true, data: transformed };
        }
        return { success: false, data: {} as AIProvider, error: response.error };
      } catch (error) {
        return {
          success: false,
          data: {} as AIProvider,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update provider",
        };
      }
    },

    deleteProvider: async (id: string) => {
      return authenticatedClient.delete(`/providers/${id}`);
    },

    // Model discovery
    // Note: Parameter named 'id' to match API Gateway path parameter {id}
    discoverModels: async (id: string) => {
      try {
        const response = await authenticatedClient.post<{ success: boolean; discoveredCount: number; models: ModelApiData[] }>(
          `/providers/${id}/discover`
        );
        if (response.success && response.data) {
          const transformedModels = response.data.models?.map(transformModelResponse) || [];
          return {
            success: true,
            data: {
              success: response.data.success,
              discoveredCount: response.data.discoveredCount,
              models: transformedModels,
            },
          };
        }
        return {
          success: false,
          data: {
            success: false,
            discoveredCount: 0,
            models: [],
          },
          error: response.error,
        };
      } catch (error) {
        return {
          success: false,
          data: {
            success: false,
            discoveredCount: 0,
            models: [],
          },
          error:
            error instanceof Error
              ? error.message
              : "Failed to discover models",
        };
      }
    },

    // Model validation
    // Note: Parameter named 'id' to match API Gateway path parameter {id}
    validateModels: async (id: string) => {
      try {
        const response = await authenticatedClient.post<ValidateModelsResponse>(
          `/providers/${id}/validate-models`
        );
        if (response.success && response.data) {
          return { success: true, data: response.data };
        }
        return {
          success: false,
          data: {
            message: "",
            validated: 0,
            available: 0,
            unavailable: 0,
            results: [],
          },
          error: response.error,
        };
      } catch (error) {
        return {
          success: false,
          data: {
            message: "",
            validated: 0,
            available: 0,
            unavailable: 0,
            results: [],
          },
          error:
            error instanceof Error
              ? error.message
              : "Failed to validate models",
        };
      }
    },

    // Get validation status
    // Note: Parameter named 'id' to match API Gateway path parameter {id}
    getValidationStatus: async (id: string) => {
      try {
        const response = await authenticatedClient.get<{ status: string; current_model_id?: string; validated?: number; total?: number; available?: number; unavailable?: number }>(
          `/providers/${id}/validation-status`
        );
        if (response.success && response.data) {
          return {
            success: true,
            data: {
              isValidating: response.data.status === "in_progress",
              currentModel: response.data.current_model_id || undefined,
              validated: response.data.validated || 0,
              total: response.data.total || 0,
              available: response.data.available || 0,
              unavailable: response.data.unavailable || 0,
            },
          };
        }
        return {
          success: false,
          data: {
            isValidating: false,
            validated: 0,
            total: 0,
            available: 0,
            unavailable: 0,
          },
          error: response.error,
        };
      } catch (error) {
        return {
          success: false,
          data: {
            isValidating: false,
            validated: 0,
            total: 0,
            available: 0,
            unavailable: 0,
          },
          error:
            error instanceof Error
              ? error.message
              : "Failed to get validation status",
        };
      }
    },

    // Model operations
    getModels: async (providerId?: string) => {
      try {
        const url = providerId ? `/models?providerId=${providerId}` : "/models";
        const response = await authenticatedClient.get<ModelApiData[] | { data: ModelApiData[] }>(
          url
        );
        // Backend returns models in the response data array
        const models = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];

        return {
          success: true,
          data: models.map(transformModelResponse),
        };
      } catch (error) {
        return {
          success: false,
          data: [],
          error:
            error instanceof Error ? error.message : "Failed to fetch models",
        };
      }
    },

    getModel: async (id: string) => {
      const response = await authenticatedClient.get<ModelApiData>(`/models/${id}`);
      if (response.success && response.data) {
        const transformed = transformModelResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as AIModel, error: response.error };
    },

    testModel: async (id: string, data: TestModelInput) => {
      return authenticatedClient.post(`/models/${id}/test`, data);
    },
  };
}
