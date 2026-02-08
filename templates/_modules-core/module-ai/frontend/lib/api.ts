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
 * API response interfaces (camelCase from backend)
 */
interface ProviderApiData {
  id: string;
  name: string;
  displayName?: string | null;
  providerType: string;
  authMethod?: string | null;
  credentialsSecretPath?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  modelCounts?: {
    total?: number;
    discovered?: number;
    testing?: number;
    available?: number;
    unavailable?: number;
    deprecated?: number;
    byCategory?: Record<string, number>;
  };
  lastValidatedAt?: string | null;
}

interface ModelApiData {
  id: string;
  providerId: string;
  modelId: string;
  displayName?: string | null;
  capabilities?: ModelCapabilities | null;
  status?: ModelStatus;
  validationCategory?: ValidationCategory | null;
  costPer1kTokensInput?: number | null;
  costPer1kTokensOutput?: number | null;
  lastDiscoveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

interface ProviderInputApiData {
  name?: string;
  displayName?: string;
  providerType?: string;
  authMethod?: string;
  credentialsSecretPath?: string;
  isActive?: boolean;
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
 * Transform API response to frontend types
 * Backend now returns camelCase, so this is mostly a pass-through
 */
function transformProviderResponse(apiData: ProviderApiData): AIProvider {
  return {
    id: apiData.id,
    name: apiData.name,
    displayName: apiData.displayName || null,
    providerType: apiData.providerType,
    authMethod: (apiData.authMethod as 'iam_role' | 'secrets_manager' | 'ssm_parameter') || 'secrets_manager',
    credentialsSecretPath: apiData.credentialsSecretPath || null,
    isActive: apiData.isActive ?? true,
    createdAt: apiData.createdAt,
    updatedAt: apiData.updatedAt,
    createdBy: apiData.createdBy || null,
    updatedBy: apiData.updatedBy || null,
    modelCounts: apiData.modelCounts
      ? {
          total: apiData.modelCounts.total || 0,
          discovered: apiData.modelCounts.discovered || 0,
          testing: apiData.modelCounts.testing || 0,
          available: apiData.modelCounts.available || 0,
          unavailable: apiData.modelCounts.unavailable || 0,
          deprecated: apiData.modelCounts.deprecated || 0,
          byCategory: apiData.modelCounts.byCategory || undefined,
        }
      : undefined,
    lastValidatedAt: apiData.lastValidatedAt || null,
  };
}

function transformModelResponse(apiData: ModelApiData): AIModel {
  // Backend now returns camelCase, minimal transformation needed
  let capabilities: ModelCapabilities | null = null;
  if (apiData.capabilities) {
    // Handle stringified capabilities (legacy data) or object (new data)
    capabilities = typeof apiData.capabilities === 'string' 
      ? JSON.parse(apiData.capabilities) 
      : apiData.capabilities;
  }

  return {
    id: apiData.id,
    providerId: apiData.providerId,
    modelId: apiData.modelId,
    displayName: apiData.displayName || null,
    description: (apiData as any).description || null,
    capabilities,
    status: apiData.status || "available",
    validationCategory: apiData.validationCategory || null,
    costPer1kTokensInput: apiData.costPer1kTokensInput || null,
    costPer1kTokensOutput: apiData.costPer1kTokensOutput || null,
    lastDiscoveredAt: apiData.lastDiscoveredAt || null,
    createdAt: apiData.createdAt,
    updatedAt: apiData.updatedAt,
    createdBy: apiData.createdBy || null,
    updatedBy: apiData.updatedBy || null,
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
  if ("displayName" in input) result.displayName = input.displayName;
  if ("providerType" in input) result.providerType = input.providerType;
  if ("authMethod" in input) result.authMethod = input.authMethod;
  if ("credentialsSecretPath" in input)
    result.credentialsSecretPath = input.credentialsSecretPath;
  if ("isActive" in input) result.isActive = input.isActive;

  return result;
}

export interface AIEnablementApiClient {
  // Provider endpoints (platform-level, no orgId needed)
  getProviders: () => Promise<ApiResponse<AIProvider[]>>;
  getProvider: (providerId: string) => Promise<ApiResponse<AIProvider>>;
  createProvider: (
    data: CreateProviderInput
  ) => Promise<ApiResponse<AIProvider>>;
  updateProvider: (
    providerId: string,
    data: UpdateProviderInput
  ) => Promise<ApiResponse<AIProvider>>;
  deleteProvider: (providerId: string) => Promise<ApiResponse<void>>;

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
  getModel: (modelId: string) => Promise<ApiResponse<AIModel>>;
  testModel: (
    modelId: string,
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
        const response = await authenticatedClient.get<ProviderApiData[] | { data: ProviderApiData[] }>(`/admin/sys/ai/providers`);
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

    getProvider: async (providerId: string) => {
      const response = await authenticatedClient.get<ProviderApiData>(`/admin/sys/ai/providers/${providerId}`);
      if (response.success && response.data) {
        const transformed = transformProviderResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as AIProvider, error: response.error };
    },

    createProvider: async (data: CreateProviderInput) => {
      const payload = transformProviderInput(data);
      const response = await authenticatedClient.post<ProviderApiData>(`/admin/sys/ai/providers`, payload);
      if (response.success && response.data) {
        const transformed = transformProviderResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as AIProvider, error: response.error };
    },

    updateProvider: async (providerId: string, data: UpdateProviderInput) => {
      try {
        const payload = transformProviderInput(data);
        const response = await authenticatedClient.put<ProviderApiData>(
          `/admin/sys/ai/providers/${providerId}`,
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

    deleteProvider: async (providerId: string) => {
      return authenticatedClient.delete(`/admin/sys/ai/providers/${providerId}`);
    },

    // Model discovery
    discoverModels: async (providerId: string) => {
      try {
        const response = await authenticatedClient.post<{ success: boolean; discoveredCount: number; models: ModelApiData[] }>(
          `/admin/sys/ai/providers/${providerId}/discover`
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
    validateModels: async (providerId: string) => {
      try {
        const response = await authenticatedClient.post<ValidateModelsResponse>(
          `/admin/sys/ai/providers/${providerId}/validate-models`
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
    getValidationStatus: async (providerId: string) => {
      try {
        const response = await authenticatedClient.get<{ status: string; currentModelId?: string; validated?: number; total?: number; available?: number; unavailable?: number }>(
          `/admin/sys/ai/providers/${providerId}/validation-status`
        );
        if (response.success && response.data) {
          return {
            success: true,
            data: {
              isValidating: response.data.status === "in_progress",
              currentModel: response.data.currentModelId || undefined,
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
        const url = providerId ? `/admin/sys/ai/models?providerId=${providerId}` : "/admin/sys/ai/models";
        const response = await authenticatedClient.get<ModelApiData[] | { data: ModelApiData[] } | { data: { deployments: ModelApiData[] } }>(
          url
        );
        // Backend returns models in different structures:
        // - /models?providerId=xxx returns array
        // - /admin/ai/models returns {data: {deployments: [...]}}
        let models: ModelApiData[] = [];
        
        if (Array.isArray(response)) {
          models = response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          const data = response.data;
          if (Array.isArray(data)) {
            models = data;
          } else if (data && typeof data === 'object' && 'deployments' in data && Array.isArray(data.deployments)) {
            models = data.deployments;
          }
        }

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

    getModel: async (modelId: string) => {
      const response = await authenticatedClient.get<ModelApiData>(`/admin/sys/ai/models/${modelId}`);
      if (response.success && response.data) {
        const transformed = transformModelResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as AIModel, error: response.error };
    },

    testModel: async (modelId: string, data: TestModelInput) => {
      return authenticatedClient.post(`/admin/sys/ai/models/${modelId}/test`, data);
    },
  };
}

// =============================================================================
// ORG ADMIN API
// =============================================================================

/**
 * Get the API base URL from environment
 */
const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_CORA_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "/api"
    );
  }
  return process.env.NEXT_PUBLIC_CORA_API_URL || "";
};

/**
 * Build URL with query parameters
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(endpoint, 'https://placeholder');
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return `${url.pathname}${url.search}`;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${getApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  if (!response.body || response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Get organization AI configuration (org admin)
 * GET /admin/org/ai/config?orgId={orgId}
 * 
 * ✅ STANDARD PATTERN: Accepts token string and orgId (extracted at page level)
 */
export async function getOrgAdminConfig(token: string, orgId: string): Promise<{
  orgId: string;
  orgSystemPrompt?: string | null;
  policyMissionType?: string | null;
  customSystemPrompt?: string | null;
  customContextPrompt?: string | null;
  citationStyle?: string | null;
  includePageNumbers?: boolean | null;
  includeSourceMetadata?: boolean | null;
  responseTone?: string | null;
  maxResponseLength?: number | null;
  platformConfig?: {
    systemPrompt?: string;
    defaultChatDeploymentId?: string;
    defaultEmbeddingDeploymentId?: string;
    chatDeployment?: any;
    embeddingDeployment?: any;
  };
  combinedPrompt?: string;
}> {
  const url = buildUrl("/admin/org/ai/config", { orgId });
  const response = await apiRequest<{ success: boolean; data: any }>(url, token);
  return response.data;
}

/**
 * Update organization AI configuration (org admin)
 * PUT /admin/org/ai/config?orgId={orgId}
 * 
 * ✅ STANDARD PATTERN: Accepts token string and orgId (extracted at page level)
 */
export async function updateOrgAdminConfig(
  token: string,
  orgId: string,
  config: {
    orgSystemPrompt?: string | null;
    policyMissionType?: string | null;
    customSystemPrompt?: string | null;
    customContextPrompt?: string | null;
    citationStyle?: string | null;
    includePageNumbers?: boolean | null;
    includeSourceMetadata?: boolean | null;
    responseTone?: string | null;
    maxResponseLength?: number | null;
  }
): Promise<{ message: string }> {
  const url = buildUrl("/admin/org/ai/config", { orgId });
  return apiRequest(url, token, {
    method: "PUT",
    body: JSON.stringify(config),
  });
}
