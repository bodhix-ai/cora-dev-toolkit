/**
 * This barrel file serves as the public API for the AI Enablement module's frontend.
 * It exports all the necessary components, hooks, types, and client factories
 * that other parts of the application can consume.
 *
 * By using a barrel file, we can simplify imports in other modules, like so:
 * import { ProviderList, useProviders } from "@{{PROJECT_NAME}}/ai-enablement-module";
 */

// Provider Components
export { ProviderList } from "./components/providers/ProviderList";
export { ProviderCard } from "./components/providers/ProviderCard";
export { ProviderForm } from "./components/providers/ProviderForm";

// Model Components
export { ModelList } from "./components/models/ModelList";
export { ModelCard } from "./components/models/ModelCard";
export { TestModelDialog } from "./components/models/TestModelDialog";

// Admin Components
export { AIEnablementAdmin } from "./components/admin/AIEnablementAdmin";
export { ProvidersTab } from "./components/admin/ProvidersTab";
export { ModelsTab } from "./components/admin/ModelsTab";
export { PlatformConfigTab } from "./components/admin/PlatformConfigTab";

// Hooks
export { useProviders } from "./hooks/useProviders";
export { useModels } from "./hooks/useModels";

// API Client
export { createAIEnablementClient } from "./lib/api";

// Types
export type {
  AIProvider,
  AIModel,
  CreateProviderInput,
  UpdateProviderInput,
  TestModelInput,
  TestModelResponse,
  DiscoverModelsResponse,
  ModelCapabilities,
  ModelStatus,
  ProviderType,
  ApiResponse,
  ModelCounts,
  ValidationCategory,
  ValidationProgress,
  ValidateModelsResponse,
  ValidationHistoryEntry,
} from "./types";

// Admin Card
export { aiEnablementAdminCard } from "./adminCard";
