/**
 * Module Eval - Frontend Index
 *
 * Barrel export for module-eval frontend components, types, and utilities.
 * Import from this file for clean module imports:
 *
 * @example
 * import { Evaluation, createEvaluation, EvalApiError } from '@/modules/module-eval/frontend';
 */

// =============================================================================
// TYPES
// =============================================================================

export * from "./types";

// Re-export commonly used types for convenience
export type {
  // Config types
  EvalSysConfig,
  EvalOrgConfig,
  EvalMergedPromptConfig,
  EvalSysStatusOption,
  EvalOrgStatusOption,
  OrgDelegationStatus,
  // Entity types
  EvalDocType,
  EvalCriteriaSet,
  EvalCriteriaItem,
  Evaluation,
  EvaluationDocument,
  EvalCriteriaResult,
  EvalResultEdit,
  Citation,
  StatusOption,
  CriteriaResultWithItem,
  // Input types
  CreateDocTypeInput,
  UpdateDocTypeInput,
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
  ImportCriteriaSetInput,
  CreateCriteriaItemInput,
  UpdateCriteriaItemInput,
  CreateEvaluationInput,
  EditResultInput,
  // Response types
  ListEvaluationsResponse,
  EvaluationStatusResponse,
  EditHistoryResponse,
  ExportResponse,
  ImportCriteriaSetResult,
  // Option types
  ListEvaluationsOptions,
  ListDocTypesOptions,
  ListCriteriaSetsOptions,
  ListCriteriaItemsOptions,
  ListStatusOptionsOptions,
  // Enums
  CategoricalMode,
  StatusOptionMode,
  PromptType,
  EvaluationStatus,
} from "./types";

// =============================================================================
// API CLIENT
// =============================================================================

export * from "./lib/api";

// Re-export commonly used API functions for convenience
export {
  // Error class
  EvalApiError,
  // System config
  getSysConfig,
  updateSysConfig,
  // System status options
  listSysStatusOptions,
  createSysStatusOption,
  updateSysStatusOption,
  deleteSysStatusOption,
  // System prompts
  listSysPrompts,
  updateSysPrompt,
  testSysPrompt,
  // Delegation
  listOrgsDelegation,
  toggleOrgDelegation,
  // Org config
  getOrgConfig,
  updateOrgConfig,
  // Org status options
  listOrgStatusOptions,
  createOrgStatusOption,
  updateOrgStatusOption,
  deleteOrgStatusOption,
  // Org prompts
  listOrgPrompts,
  updateOrgPrompt,
  testOrgPrompt,
  // Doc types
  listDocTypes,
  getDocType,
  createDocType,
  updateDocType,
  deleteDocType,
  // Criteria sets
  listCriteriaSets,
  getCriteriaSet,
  createCriteriaSet,
  updateCriteriaSet,
  deleteCriteriaSet,
  importCriteriaSet,
  // Criteria items
  listCriteriaItems,
  addCriteriaItem,
  updateCriteriaItem,
  deleteCriteriaItem,
  // Evaluations
  createEvaluation,
  listEvaluations,
  getEvaluation,
  getEvaluationStatus,
  deleteEvaluation,
  // Result editing
  editResult,
  getEditHistory,
  // Export
  exportPdf,
  exportXlsx,
  // Helpers
  downloadExport,
  pollEvaluationStatus,
  fileToBase64,
  prepareImportInput,
} from "./lib/api";

// =============================================================================
// STORE
// =============================================================================

export * from "./store";

// Re-export commonly used store exports for convenience
export {
  useEvalStore,
  // Selectors
  selectProcessingEvaluations,
  selectCompletedEvaluations,
  selectFailedEvaluations,
  selectEvaluationsByDocType,
  selectActiveDocTypes,
  selectCriteriaSetsByDocType,
  selectIsAnyProcessing,
  selectCurrentProgress,
  selectOrgDelegation,
} from "./store";
