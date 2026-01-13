/**
 * AI Provider types based on ai_providers table schema
 * Platform-level configuration - no orgId
 */
export interface AIProvider {
  id: string;
  name: string;
  displayName: string | null;
  providerType: string; // e.g., 'aws_bedrock', 'azure_openai', 'openai'
  authMethod: 'iam_role' | 'secrets_manager' | 'ssm_parameter'; // Authentication method
  credentialsSecretPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  modelCounts?: ModelCounts; // Optional model counts (when included in response)
  lastValidatedAt?: string | null; // Last validation timestamp
}

/**
 * AI Model types based on ai_models table schema
 * Platform-level catalog - no orgId
 */
export interface AIModel {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string | null;
  description: string | null;
  capabilities: ModelCapabilities | null;
  status: ModelStatus;
  validationCategory?: ValidationCategory | null;
  validationError?: string | null;
  costPer1kTokensInput: number | null;
  costPer1kTokensOutput: number | null;
  lastDiscoveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Model capabilities structure
 */
export interface ModelCapabilities {
  chat?: boolean;
  embedding?: boolean;
  maxTokens?: number;
  supportsStreaming?: boolean;
  supportsVision?: boolean;
  dimensions?: number;
  embeddingDimensions?: number;
  // Allow additional capability properties from different providers
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Model status enum
 */
export type ModelStatus =
  | "discovered"
  | "testing"
  | "available"
  | "unavailable"
  | "deprecated";

/**
 * Provider type enum
 */
export type ProviderType = "aws_bedrock" | "azure_openai" | "openai";

/**
 * Create Provider DTO
 */
export interface CreateProviderInput {
  name: string;
  displayName?: string;
  providerType: ProviderType;
  authMethod?: 'iam_role' | 'secrets_manager' | 'ssm_parameter';
  credentialsSecretPath?: string;
  isActive?: boolean;
}

/**
 * Update Provider DTO
 */
export interface UpdateProviderInput {
  displayName?: string;
  authMethod?: 'iam_role' | 'secrets_manager' | 'ssm_parameter';
  credentialsSecretPath?: string;
  isActive?: boolean;
}

/**
 * Model test request
 */
export interface TestModelInput {
  prompt: string;
  maxTokens?: number;
}

/**
 * Model test response
 */
export interface TestModelResponse {
  success: boolean;
  response: string;
  latencyMs: number;
  tokenCount?: {
    input: number;
    output: number;
  };
}

/**
 * Discover models response
 */
export interface DiscoverModelsResponse {
  success: boolean;
  discoveredCount: number;
  models: AIModel[];
}

/**
 * Validate models response
 */
export interface ValidateModelsResponse {
  message: string;
  validated: number;
  available: number;
  unavailable: number;
  results: Array<{
    modelId: string;
    status: string;
    error?: string;
    latencyMs?: number;
  }>;
}

/**
 * Model counts by status for a provider
 */
export interface ModelCounts {
  total: number;
  discovered: number;
  testing: number;
  available: number;
  unavailable: number;
  deprecated?: number;
  byCategory?: Record<string, number>; // Breakdown by validation category
}

/**
 * Validation categories for models
 */
export type ValidationCategory =
  | "direct_invocation"
  | "requires_inference_profile"
  | "requires_marketplace"
  | "invalid_request_format"
  | "access_denied"
  | "deprecated"
  | "timeout"
  | "unknown_error";

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Validation progress state for real-time updates
 */
export interface ValidationProgress {
  isValidating: boolean;
  currentModel?: string;
  validated: number;
  total: number;
  available: number;
  unavailable: number;
}

/**
 * Validation history entry
 */
export interface ValidationHistoryEntry {
  id: string;
  providerId: string;
  modelId: string;
  status: "available" | "unavailable";
  errorMessage?: string;
  latencyMs?: number;
  validatedAt: string;
  validatedBy: string;
}
