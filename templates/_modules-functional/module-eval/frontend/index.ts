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

// =============================================================================
// HOOKS
// =============================================================================

export * from "./hooks";

// Re-export commonly used hooks for convenience
export {
  // Admin hooks
  useSysEvalConfig,
  useSysEvalPrompts,
  useOrgsDelegation,
  useOrgEvalConfig,
  useOrgEvalPrompts,
  useEvalConfig,
  useEvalDocTypes,
  useEvalDocType,
  useDocTypeSelect,
  useEvalCriteriaSets,
  useEvalCriteriaSetsByDocType,
  useEvalCriteriaSet,
  useCriteriaSetSelect,
  useEvalCriteriaItems,
  useSysStatusOptions,
  useOrgStatusOptions,
  useActiveStatusOptions,
  useStatusOptionSelect,
  // User hooks
  useEvaluations,
  useProcessingEvaluations,
  useCompletedEvaluations,
  useFailedEvaluations,
  useEvaluationsByDocType,
  useEvaluationStats,
  useEvaluation,
  useEvaluationResults,
  useEvaluationSummary,
  useEvaluationDocuments,
  useEvaluationCitations,
  useEvalProgress,
  useProgressBar,
  useAnyProcessing,
  useProgressSteps,
  useEvalExport,
  useExportButtons,
  useBulkExport,
} from "./hooks";

// =============================================================================
// COMPONENTS
// =============================================================================

export * from "./components";

// Re-export commonly used components for convenience
export {
  // Progress & Status
  EvalProgressCard,
  EvalProgressCardCompact,
  EvalProgressList,
  // Results Table
  EvalResultsTable,
  // Citations
  CitationViewer,
  CitationCard,
  InlineCitation,
  CitationTooltip,
  CitationSummary,
  // Q&A Results
  EvalQAList,
  EvalQACard,
  EvalQAStats,
  // Summary Panels
  EvalSummaryPanel,
  DocSummaryPanel,
  ComplianceScore,
  SummaryStats,
  // Result Editing
  ResultEditDialog,
  ConfirmDialog,
  // Export
  EvalExportButton,
  ExportButtonsGroup,
  ExportStatus,
  ExportDropdown,
} from "./components";

// =============================================================================
// PAGES
// =============================================================================

export * from "./pages";

// Re-export commonly used pages for convenience
export {
  // User pages
  EvalListPage,
  EvalDetailPage,
  // System admin pages
  SysEvalConfigPage,
  SysEvalPromptsPage,
  // Org admin pages
  OrgEvalConfigPage,
  OrgEvalPromptsPage,
  OrgEvalDocTypesPage,
  OrgEvalCriteriaPage,
} from "./pages";

// Re-export page prop types
export type {
  EvalListPageProps,
  EvalDetailPageProps,
  SysEvalConfigPageProps,
  SysEvalPromptsPageProps,
  OrgEvalConfigPageProps,
  OrgEvalPromptsPageProps,
  OrgEvalDocTypesPageProps,
  OrgEvalCriteriaPageProps,
} from "./pages";
