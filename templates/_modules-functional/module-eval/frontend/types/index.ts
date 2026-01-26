/**
 * Module Eval - TypeScript Types
 *
 * Type definitions for evaluation configuration, document types, criteria,
 * evaluations, results, and exports.
 * Aligned with CORA module-eval data model specification.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Categorical scoring mode */
export type CategoricalMode = "boolean" | "detailed";

/** Status option mode (which categorical modes it applies to) */
export type StatusOptionMode = "boolean" | "detailed" | "both";

/** Prompt type for AI configuration */
export type PromptType = "doc_summary" | "evaluation" | "eval_summary";

/** Evaluation processing status */
export type EvaluationStatus = "draft" | "pending" | "processing" | "completed" | "failed";

// =============================================================================
// SYSTEM CONFIGURATION TYPES
// =============================================================================

/**
 * System-level evaluation configuration (platform defaults)
 */
export interface EvalSysConfig {
  /** Unique ID */
  id: string;
  /** Default scoring mode: boolean (pass/fail) or detailed (multiple levels) */
  categoricalMode: CategoricalMode;
  /** Whether to display numerical compliance scores */
  showNumericalScore: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Creator user ID */
  createdBy?: string;
  /** Last updater user ID */
  updatedBy?: string;
}

/**
 * System-level prompt configuration
 */
export interface EvalSysPromptConfig {
  /** Unique ID */
  id: string;
  /** Prompt type */
  promptType: PromptType;
  /** AI provider ID */
  aiProviderId?: string;
  /** AI model ID */
  aiModelId?: string;
  /** System prompt text */
  systemPrompt?: string;
  /** User prompt template with placeholders */
  userPromptTemplate?: string;
  /** Temperature setting (0-1) */
  temperature: number;
  /** Max tokens for response */
  maxTokens: number;
  /** Whether org has an override for this prompt */
  hasOrgOverride: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * System-level status option
 */
export interface EvalSysStatusOption {
  /** Unique ID */
  id: string;
  /** Status name (e.g., "Compliant", "Non-Compliant") */
  name: string;
  /** Color for UI display (hex) */
  color: string;
  /** Numerical score value for calculations */
  scoreValue?: number;
  /** Display order */
  orderIndex: number;
  /** Which categorical mode this option applies to */
  mode: StatusOptionMode;
}

// =============================================================================
// ORGANIZATION CONFIGURATION TYPES
// =============================================================================

/**
 * Organization-level evaluation configuration
 */
export interface EvalOrgConfig {
  /** Organization ID */
  orgId: string;
  /** Whether org can configure AI settings */
  aiConfigDelegated: boolean;
  /** Categorical mode override (null = use sys default) */
  categoricalMode?: CategoricalMode;
  /** Show numerical score override (null = use sys default) */
  showNumericalScore?: boolean;
  /** Which settings are org overrides */
  isOrgOverride?: {
    categoricalMode: boolean;
    showNumericalScore: boolean;
  };
}

/**
 * Organization-level prompt configuration
 */
export interface EvalOrgPromptConfig {
  /** Unique ID */
  id: string;
  /** Organization ID */
  orgId: string;
  /** Prompt type */
  promptType: PromptType;
  /** AI provider ID override */
  aiProviderId?: string;
  /** AI model ID override */
  aiModelId?: string;
  /** System prompt override */
  systemPrompt?: string;
  /** User prompt template override */
  userPromptTemplate?: string;
  /** Temperature override */
  temperature?: number;
  /** Max tokens override */
  maxTokens?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Merged prompt configuration (sys defaults + org overrides)
 */
export interface EvalMergedPromptConfig {
  /** Prompt type */
  promptType: PromptType;
  /** Effective AI provider ID */
  aiProviderId?: string;
  /** Effective AI model ID */
  aiModelId?: string;
  /** Effective system prompt */
  systemPrompt?: string;
  /** Effective user prompt template */
  userPromptTemplate?: string;
  /** Effective temperature */
  temperature: number;
  /** Effective max tokens */
  maxTokens: number;
  /** Whether org has an override */
  hasOrgOverride: boolean;
}

/**
 * Organization-level status option
 */
export interface EvalOrgStatusOption {
  /** Unique ID */
  id: string;
  /** Organization ID */
  orgId: string;
  /** Status name */
  name: string;
  /** Color for UI display (hex) */
  color: string;
  /** Numerical score value */
  scoreValue?: number;
  /** Display order */
  orderIndex: number;
  /** Which categorical mode this option applies to */
  mode: StatusOptionMode;
  /** Whether option is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Organization with delegation status (for sys admin view)
 */
export interface OrgDelegationStatus {
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** Whether AI config is delegated */
  aiConfigDelegated: boolean;
  /** Whether org has custom config */
  hasOrgConfig: boolean;
}

// =============================================================================
// DOCUMENT TYPE TYPES
// =============================================================================

/**
 * Document type for evaluation categorization
 */
export interface EvalDocType {
  /** Unique ID */
  id: string;
  /** Organization ID */
  orgId: string;
  /** Document type name (e.g., "IT Security Policy") */
  name: string;
  /** Description */
  description?: string;
  /** Whether active */
  isActive: boolean;
  /** Count of criteria sets */
  criteriaSetsCount?: number;
  /** Associated criteria sets (when fetched with detail) */
  criteriaSets?: EvalCriteriaSet[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Creator user ID */
  createdBy?: string;
  /** Last updater user ID */
  updatedBy?: string;
}

/**
 * Input for creating a document type
 */
export interface CreateDocTypeInput {
  /** Document type name */
  name: string;
  /** Description */
  description?: string;
}

/**
 * Input for updating a document type
 */
export interface UpdateDocTypeInput {
  /** Document type name */
  name?: string;
  /** Description */
  description?: string;
  /** Whether active */
  isActive?: boolean;
}

// =============================================================================
// CRITERIA SET TYPES
// =============================================================================

/**
 * Criteria set for evaluation
 */
export interface EvalCriteriaSet {
  /** Unique ID */
  id: string;
  /** Parent document type ID */
  docTypeId: string;
  /** Criteria set name */
  name: string;
  /** Description */
  description?: string;
  /** Version string */
  version: string;
  /** Whether to use weighted scoring */
  useWeightedScoring: boolean;
  /** Source file name (for imports) */
  sourceFileName?: string;
  /** Whether active */
  isActive: boolean;
  /** Count of criteria items */
  itemCount?: number;
  /** Associated criteria items (when fetched with detail) */
  items?: EvalCriteriaItem[];
  /** Parent document type (when fetched with detail) */
  docType?: EvalDocType;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Creator user ID */
  createdBy?: string;
  /** Last updater user ID */
  updatedBy?: string;
}

/**
 * Input for creating a criteria set
 */
export interface CreateCriteriaSetInput {
  /** Parent document type ID */
  docTypeId: string;
  /** Criteria set name */
  name: string;
  /** Description */
  description?: string;
  /** Version string */
  version?: string;
  /** Whether to use weighted scoring */
  useWeightedScoring?: boolean;
}

/**
 * Input for updating a criteria set
 */
export interface UpdateCriteriaSetInput {
  /** Criteria set name */
  name?: string;
  /** Description */
  description?: string;
  /** Version string */
  version?: string;
  /** Whether to use weighted scoring */
  useWeightedScoring?: boolean;
  /** Whether active */
  isActive?: boolean;
}

/**
 * Input for importing criteria from spreadsheet
 */
export interface ImportCriteriaSetInput {
  /** Parent document type ID */
  docTypeId: string;
  /** Criteria set name */
  name: string;
  /** Description */
  description?: string;
  /** Version string */
  version?: string;
  /** Whether to use weighted scoring */
  useWeightedScoring?: boolean;
  /** Base64 encoded file content */
  fileContent: string;
  /** Original file name */
  fileName: string;
  /** File type (csv, xlsx) */
  fileType: "csv" | "xlsx";
}

/**
 * Result of criteria import operation
 */
export interface ImportCriteriaSetResult {
  /** Created criteria set ID */
  criteriaSetId: string;
  /** Criteria set name */
  name: string;
  /** Version */
  version: string;
  /** Total rows processed */
  totalRows: number;
  /** Successfully imported count */
  successCount: number;
  /** Error count */
  errorCount: number;
  /** Import errors (first 10) */
  errors: ImportError[];
}

/**
 * Import error detail
 */
export interface ImportError {
  /** Row number in source file */
  row: number;
  /** Criteria ID (if available) */
  criteriaId?: string;
  /** Error message */
  error: string;
}

// =============================================================================
// CRITERIA ITEM TYPES
// =============================================================================

/**
 * Individual criteria item
 */
export interface EvalCriteriaItem {
  /** Unique ID */
  id: string;
  /** Parent criteria set ID */
  criteriaSetId: string;
  /** External criteria ID (e.g., "AC-1", "SI-3") */
  criteriaId: string;
  /** Requirement text */
  requirement: string;
  /** Detailed description */
  description?: string;
  /** Category/grouping */
  category?: string;
  /** Weight for scoring */
  weight: number;
  /** Display order */
  orderIndex: number;
  /** Whether active */
  isActive: boolean;
}

/**
 * Input for creating a criteria item
 */
export interface CreateCriteriaItemInput {
  /** External criteria ID */
  criteriaId: string;
  /** Requirement text */
  requirement: string;
  /** Detailed description */
  description?: string;
  /** Category/grouping */
  category?: string;
  /** Weight for scoring */
  weight?: number;
  /** Display order */
  orderIndex?: number;
}

/**
 * Input for updating a criteria item
 */
export interface UpdateCriteriaItemInput {
  /** External criteria ID */
  criteriaId?: string;
  /** Requirement text */
  requirement?: string;
  /** Detailed description */
  description?: string;
  /** Category/grouping */
  category?: string;
  /** Weight for scoring */
  weight?: number;
  /** Display order */
  orderIndex?: number;
  /** Whether active */
  isActive?: boolean;
}

// =============================================================================
// EVALUATION TYPES
// =============================================================================

/**
 * Evaluation (document summary) record
 */
export interface Evaluation {
  /** Unique ID */
  id: string;
  /** Workspace ID */
  workspaceId: string;
  /** Document type ID */
  docTypeId: string;
  /** Criteria set ID */
  criteriaSetId: string;
  /** Evaluation name */
  name: string;
  /** Processing status */
  status: EvaluationStatus;
  /** Processing progress (0-100) */
  progress: number;
  /** AI-generated document summary */
  docSummary?: string;
  /** AI-generated evaluation summary */
  evalSummary?: string;
  /** Overall compliance score percentage */
  complianceScore?: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Processing start time */
  startedAt?: string;
  /** Processing completion time */
  completedAt?: string;
  /** Soft delete flag */
  isDeleted: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Creator user ID */
  createdBy?: string;
  /** Last updater user ID */
  updatedBy?: string;

  // === Joined/Computed Fields ===

  /** Document type name */
  docTypeName?: string;
  /** Criteria set name */
  criteriaSetName?: string;
  /** Number of documents */
  documentCount?: number;
  /** Document type detail */
  docType?: EvalDocType;
  /** Criteria set detail */
  criteriaSet?: EvalCriteriaSet;
  /** Associated documents */
  documents?: EvaluationDocument[];
  /** Criteria results */
  criteriaResults?: CriteriaResultWithItem[];
  /** Available status options */
  statusOptions?: StatusOption[];
  /** Score display configuration */
  scoreConfig?: ScoreConfig;
  /** All citations from criteria results */
  citations?: Citation[];
}

/**
 * Document associated with an evaluation
 */
export interface EvaluationDocument {
  /** Document ID (from KB) */
  id: string;
  /** Document ID (alias for compatibility) */
  documentId?: string;
  /** Document name */
  name?: string;
  /** Original file name */
  fileName?: string;
  /** MIME type */
  mimeType?: string;
  /** AI-generated summary for this doc */
  summary?: string;
  /** Document metadata */
  metadata?: Record<string, any>;
  /** Whether this is the primary document */
  isPrimary: boolean;
}

/**
 * Input for creating an evaluation
 */
export interface CreateEvaluationInput {
  /** Evaluation name */
  name: string;
  /** Document type ID (optional for draft mode) */
  docTypeId?: string;
  /** Criteria set ID (optional for draft mode) */
  criteriaSetId?: string;
  /** Document IDs from knowledge base (optional for draft mode) */
  docIds?: string[];
}

/**
 * Input for updating draft evaluation with configuration
 */
export interface UpdateEvaluationInput {
  /** Document type ID */
  docTypeId: string;
  /** Criteria set ID */
  criteriaSetId: string;
  /** Document IDs from knowledge base */
  docIds: string[];
}

/**
 * Evaluation status response (for polling)
 */
export interface EvaluationStatusResponse {
  /** Evaluation ID */
  id: string;
  /** Current status */
  status: EvaluationStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Processing start time */
  startedAt?: string;
  /** Processing completion time */
  completedAt?: string;
}

// =============================================================================
// CRITERIA RESULT TYPES
// =============================================================================

/**
 * AI-generated criteria result (immutable)
 */
export interface EvalCriteriaResult {
  /** Unique ID */
  id: string;
  /** Parent evaluation ID */
  evalSummaryId: string;
  /** Criteria item ID */
  criteriaItemId: string;
  /** AI-generated result/explanation */
  aiResult?: string;
  /** AI-selected status option ID */
  aiStatusId?: string;
  /** AI confidence score (0-100) */
  aiConfidence?: number;
  /** AI-generated citations */
  aiCitations: Citation[];
  /** When this item was processed */
  processedAt?: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Citation from evaluation source documents
 */
export interface Citation {
  /** Citation text excerpt */
  text: string;
  /** Source document or location */
  source?: string;
  /** Page number (if applicable) */
  pageNumber?: number;
  /** Chunk index (if applicable) */
  chunkIndex?: number;
  /** Relevance score (0-1) */
  relevanceScore?: number;
}

/**
 * Human edit of a criteria result
 */
export interface EvalResultEdit {
  /** Unique ID */
  id: string;
  /** Parent criteria result ID */
  criteriaResultId: string;
  /** Edited result/explanation */
  editedResult?: string;
  /** Edited status option ID */
  editedStatusId?: string;
  /** Edited score value (numerical) */
  editedScoreValue?: number;
  /** Notes about the edit */
  editNotes?: string;
  /** Version number */
  version: number;
  /** Whether this is the current edit */
  isCurrent: boolean;
  /** Who made the edit */
  editedBy: string;
  /** When the edit was made */
  createdAt: string;

  // === Joined Fields ===

  /** Editor's name */
  editorName?: string;
  /** Editor's email */
  editorEmail?: string;
}

/**
 * Input for editing a criteria result
 */
export interface EditResultInput {
  /** Edited result/explanation */
  editedResult?: string;
  /** Edited status option ID */
  editedStatusId?: string;
  /** Notes about the edit */
  editNotes?: string;
}

/**
 * Status option for display
 */
export interface StatusOption {
  /** Status option ID */
  id: string;
  /** Status name */
  name: string;
  /** Color (hex) */
  color?: string;
  /** Score value */
  scoreValue?: number;
}

/**
 * Score display configuration (from API)
 */
export interface ScoreConfig {
  /** Scoring mode: boolean or detailed */
  categoricalMode: CategoricalMode;
  /** Whether to show numerical score alongside status chip */
  showDecimalScore: boolean;
  /** Available status options for this evaluation */
  statusOptions: StatusOption[];
}

/**
 * Criteria result with associated item and edit info
 */
export interface CriteriaResultWithItem {
  /** Criteria item details */
  criteriaItem: {
    id: string;
    criteriaId: string;
    requirement: string;
    description?: string;
    category?: string;
    weight: number;
  };
  /** AI-generated result */
  aiResult?: {
    id: string;
    result?: string;
    statusId?: string;
    confidence?: number;
    scoreValue?: number;
    citations: Citation[];
    processedAt?: string;
  };
  /** Current human edit (if any) */
  currentEdit?: EvalResultEdit;
  /** Effective status (considering edits) */
  effectiveStatus?: StatusOption;
  /** Whether result has been edited */
  hasEdit: boolean;
}

/**
 * Edit history response
 */
export interface EditHistoryResponse {
  /** Criteria result ID */
  criteriaResultId: string;
  /** Evaluation ID */
  evaluationId: string;
  /** All edits (newest first) */
  history: EvalResultEdit[];
  /** Total edit count */
  totalEdits: number;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

/**
 * Export response with download URL
 */
export interface ExportUrlResponse {
  /** Presigned download URL */
  downloadUrl: string;
  /** Export format */
  format: "pdf" | "xlsx";
  /** Evaluation ID */
  evaluationId: string;
}

/**
 * Export response with inline content
 */
export interface ExportContentResponse {
  /** Base64 encoded content */
  content: string;
  /** Content type */
  contentType: string;
  /** Suggested file name */
  fileName: string;
  /** Export format */
  format: "pdf" | "xlsx";
}

/**
 * Union type for export response
 */
export type ExportResponse = ExportUrlResponse | ExportContentResponse;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  /** Data items */
  data: T[];
  /** Pagination info */
  pagination: {
    /** Page limit */
    limit: number;
    /** Current offset */
    offset: number;
    /** Total count */
    total: number;
    /** Whether more results exist */
    hasMore: boolean;
  };
}

/**
 * List evaluations response
 */
export interface ListEvaluationsResponse {
  /** Evaluations */
  evaluations: Evaluation[];
  /** Pagination info */
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Options for listing evaluations
 */
export interface ListEvaluationsOptions {
  /** Filter by status */
  status?: EvaluationStatus;
  /** Filter by document type */
  docTypeId?: string;
  /** Include soft-deleted */
  includeDeleted?: boolean;
  /** Page limit */
  limit?: number;
  /** Page offset */
  offset?: number;
}

/**
 * Options for listing doc types
 */
export interface ListDocTypesOptions {
  /** Include inactive */
  includeInactive?: boolean;
}

/**
 * Options for listing criteria sets
 */
export interface ListCriteriaSetsOptions {
  /** Filter by document type */
  docTypeId?: string;
  /** Include inactive */
  includeInactive?: boolean;
}

/**
 * Options for listing criteria items
 */
export interface ListCriteriaItemsOptions {
  /** Filter by category */
  category?: string;
  /** Include inactive */
  includeInactive?: boolean;
}

/**
 * Options for listing status options
 */
export interface ListStatusOptionsOptions {
  /** Filter by mode */
  mode?: StatusOptionMode;
  /** Include inactive (org options only) */
  includeInactive?: boolean;
}

// =============================================================================
// INPUT TYPES FOR CONFIG UPDATES
// =============================================================================

/**
 * Input for updating system config
 */
export interface UpdateSysConfigInput {
  /** Categorical mode */
  categoricalMode?: CategoricalMode;
  /** Show numerical score */
  showNumericalScore?: boolean;
}

/**
 * Input for updating org config
 */
export interface UpdateOrgConfigInput {
  /** Categorical mode override (null to use sys default) */
  categoricalMode?: CategoricalMode | null;
  /** Show numerical score override (null to use sys default) */
  showNumericalScore?: boolean | null;
}

/**
 * Input for creating/updating status option
 */
export interface StatusOptionInput {
  /** Status name */
  name: string;
  /** Color (hex) */
  color?: string;
  /** Score value */
  scoreValue?: number;
  /** Display order */
  orderIndex?: number;
  /** Mode (for sys options) */
  mode?: StatusOptionMode;
  /** Is active (for org options) */
  isActive?: boolean;
}

/**
 * Input for updating prompt config
 */
export interface PromptConfigInput {
  /** AI provider ID */
  aiProviderId?: string;
  /** AI model ID */
  aiModelId?: string;
  /** System prompt */
  systemPrompt?: string;
  /** User prompt template */
  userPromptTemplate?: string;
  /** Temperature (0-1) */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

/**
 * Input for testing prompt
 */
export interface TestPromptInput {
  /** System prompt to test */
  systemPrompt?: string;
  /** User prompt template to test */
  userPromptTemplate?: string;
  /** Test variables to fill in template */
  testVariables?: Record<string, string>;
}

/**
 * Prompt test result
 */
export interface PromptTestResult {
  /** Prompt type */
  promptType: PromptType;
  /** Rendered system prompt */
  renderedSystemPrompt: string;
  /** Rendered user prompt */
  renderedUserPrompt: string;
  /** Status message */
  message: string;
}

/**
 * Input for toggling delegation
 */
export interface ToggleDelegationInput {
  /** Whether to enable AI config delegation */
  aiConfigDelegated: boolean;
}

/**
 * Delegation toggle result
 */
export interface DelegationToggleResult {
  /** Organization ID */
  orgId: string;
  /** Organization name */
  orgName: string;
  /** New delegation status */
  aiConfigDelegated: boolean;
  /** Status message */
  message: string;
}
