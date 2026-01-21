/**
 * AI Model Types for Module Eval
 * Adapted from module-ai for model selection
 */

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
