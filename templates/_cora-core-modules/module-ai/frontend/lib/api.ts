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
} from "../types";

/**
 * Transform snake_case API response to camelCase frontend types
 * Note: org_id removed as providers/models are now platform-level
 * @ts-expect-error - Using any for API response data as we're transforming external API responses
 */
function transformProviderResponse(apiData: any): AIProvider {
  return {
    id: apiData.id,
    name: apiData.name,
    displayName: apiData.display_name || null,
    providerType: apiData.provider_type,
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

function transformModelResponse(apiData: any): AIModel {
  return {
    id: apiData.id,
    providerId: apiData.provider_id,
    modelId: apiData.model_id,
    displayName: apiData.display_name || null,
    capabilities: apiData.capabilities || null,
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
): any {
  const result: any = {};

  if ("name" in input) result.name = input.name;
  if ("displayName" in input) result.display_name = input.displayName;
  if ("providerType" in input) result.provider_type = input.providerType;
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
  getModels: (providerId: string) => Promise<ApiResponse<AIModel[]>>;
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
  authenticatedClient: any
): AIEnablementApiClient {
  return {
    // Provider operations
    getProviders: async () => {
      try {
        // authenticatedClient returns raw API response
        // Backend returns { success: true, data: [...] }
        const response: any = await authenticatedClient.get(`/providers`);
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
      const response = await authenticatedClient.get(`/providers/${id}`);
      if (response.success && response.data) {
        response.data = transformProviderResponse(response.data);
      }
      return response;
    },

    createProvider: async (data: CreateProviderInput) => {
      const payload = transformProviderInput(data);
      const response = await authenticatedClient.post(`/providers`, payload);
      if (response.success && response.data) {
        response.data = transformProviderResponse(response.data);
      }
      return response;
    },

    updateProvider: async (id: string, data: UpdateProviderInput) => {
      try {
        const payload = transformProviderInput(data);
        const responseData = await authenticatedClient.put(
          `/providers/${id}`,
          payload
        );
        // Transform the response data
        const transformedData = transformProviderResponse(responseData);
        return {
          success: true,
          data: transformedData,
        };
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
        const responseData = await authenticatedClient.post(
          `/providers/${id}/discover`
        );
        // Transform the models in the response
        if (responseData.models) {
          responseData.models = responseData.models.map(transformModelResponse);
        }
        return {
          success: true,
          data: responseData,
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
        const responseData = await authenticatedClient.post(
          `/providers/${id}/validate-models`
        );
        return {
          success: true,
          data: responseData,
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
        const responseData = await authenticatedClient.get(
          `/providers/${id}/validation-status`
        );
        return {
          success: true,
          data: {
            isValidating: responseData.status === "in_progress",
            currentModel: responseData.current_model_id || undefined,
            validated: responseData.validated || 0,
            total: responseData.total || 0,
            available: responseData.available || 0,
            unavailable: responseData.unavailable || 0,
          },
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
    getModels: async (providerId: string) => {
      try {
        const response: any = await authenticatedClient.get(
          `/models?providerId=${providerId}`
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
      const response = await authenticatedClient.get(`/models/${id}`);
      if (response.success && response.data) {
        response.data = transformModelResponse(response.data);
      }
      return response;
    },

    testModel: async (id: string, data: TestModelInput) => {
      return authenticatedClient.post(`/models/${id}/test`, data);
    },
  };
}
