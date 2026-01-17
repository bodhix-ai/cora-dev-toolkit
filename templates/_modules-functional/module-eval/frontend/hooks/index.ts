/**
 * Module Eval - Hooks Barrel Export
 *
 * Export all React hooks for module-eval state management and operations.
 */

// =============================================================================
// ADMIN HOOKS
// =============================================================================

// Config hooks
export {
  useSysEvalConfig,
  useSysEvalPrompts,
  useOrgsDelegation,
  useOrgEvalConfig,
  useOrgEvalPrompts,
  useEvalConfig,
} from "./useEvalConfig";

// Doc types hooks
export {
  useEvalDocTypes,
  useEvalDocType,
  useDocTypeSelect,
} from "./useEvalDocTypes";

// Criteria sets hooks
export {
  useEvalCriteriaSets,
  useEvalCriteriaSetsByDocType,
  useEvalCriteriaSet,
  useCriteriaSetSelect,
  useEvalCriteriaItems,
} from "./useEvalCriteriaSets";

// Status options hooks
export {
  useSysStatusOptions,
  useOrgStatusOptions,
  useActiveStatusOptions,
  useStatusOptionSelect,
} from "./useEvalStatusOptions";

// =============================================================================
// USER HOOKS
// =============================================================================

// Evaluations list hooks
export {
  useEvaluations,
  useProcessingEvaluations,
  useCompletedEvaluations,
  useFailedEvaluations,
  useEvaluationsByDocType,
  useEvaluationStats,
} from "./useEvaluations";

// Single evaluation hooks
export {
  useEvaluation,
  useEvaluationResults,
  useEvaluationSummary,
  useEvaluationDocuments,
  useEvaluationCitations,
} from "./useEvaluation";

// Progress hooks
export {
  useEvalProgress,
  useProgressBar,
  useAnyProcessing,
  useProgressSteps,
} from "./useEvalProgress";

// Export hooks
export {
  useEvalExport,
  useExportButtons,
  useBulkExport,
} from "./useEvalExport";
