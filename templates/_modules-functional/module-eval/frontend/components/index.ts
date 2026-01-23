/**
 * Module Eval - Components Barrel Export
 *
 * Re-exports all evaluation UI components for easy import.
 */

// =============================================================================
// USER COMPONENTS
// =============================================================================

// Progress & Status
export {
  EvalProgressCard,
  EvalProgressCardCompact,
  EvalProgressList,
  type EvalProgressCardProps,
  type EvalProgressCardCompactProps,
  type EvalProgressListProps,
} from "./EvalProgressCard";

// Results Table
export {
  EvalResultsTable,
  type EvalResultsTableProps,
} from "./EvalResultsTable";

// Citations
export {
  CitationViewer,
  CitationCard,
  InlineCitation,
  CitationTooltip,
  CitationSummary,
  type CitationViewerProps,
  type CitationCardProps,
  type InlineCitationProps,
  type CitationTooltipProps,
  type CitationSummaryProps,
} from "./CitationViewer";

// Q&A Results
export {
  EvalQAList,
  EvalQACard,
  EvalQAStats,
  type EvalQAListProps,
  type EvalQACardProps,
  type EvalQAStatsProps,
} from "./EvalQAList";

// Summary Panels
export {
  EvalSummaryPanel,
  DocSummaryPanel,
  ComplianceScore,
  SummaryStats,
  type EvalSummaryPanelProps,
  type DocSummaryPanelProps,
  type ComplianceScoreProps,
  type SummaryStatsProps,
} from "./EvalSummaryPanel";

// Compliance Score Chip (Configuration-based)
// Note: StatusOption and ScoreConfig types are internal to avoid conflicts with types/index.ts
export {
  ComplianceScoreChip,
  getStatusForScore,
  type ComplianceScoreChipProps,
} from "./ComplianceScoreChip";

// Result Editing
export {
  ResultEditDialog,
  ConfirmDialog,
  type ResultEditDialogProps,
  type ConfirmDialogProps,
} from "./ResultEditDialog";

// Export
export {
  EvalExportButton,
  ExportButtonsGroup,
  ExportStatus,
  ExportDropdown,
  type ExportFormat,
  type EvalExportButtonProps,
  type ExportButtonsGroupProps,
  type ExportStatusProps,
  type ExportDropdownProps,
} from "./EvalExportButton";

// =============================================================================
// ADMIN COMPONENTS
// =============================================================================

// Doc Type Management
export {
  DocTypeManager,
  DocTypeForm,
  DocTypeCard,
  type DocTypeManagerProps,
  type DocTypeFormProps,
  type DocTypeCardProps,
} from "./DocTypeManager";

// Criteria Set Management
export {
  CriteriaSetManager,
  CriteriaSetForm,
  CriteriaSetCard,
  type CriteriaSetManagerProps,
  type CriteriaSetFormProps,
  type CriteriaSetCardProps,
} from "./CriteriaSetManager";

// Criteria Import
export {
  CriteriaImportDialog,
  FilePreview,
  ImportResultDisplay,
  ImportErrorList,
  type CriteriaImportDialogProps,
  type FilePreviewProps,
  type ImportResultDisplayProps,
  type ImportErrorListProps,
} from "./CriteriaImportDialog";

// Criteria Item Editor
export {
  CriteriaItemEditor,
  CriteriaItemForm,
  CriteriaItemRow,
  CategoryGroup,
  type CriteriaItemEditorProps,
  type CriteriaItemFormProps,
  type CriteriaItemRowProps,
  type CategoryGroupProps,
} from "./CriteriaItemEditor";

// Status Options
export {
  StatusOptionManager,
  StatusOptionForm,
  StatusOptionCard,
  ColorPicker,
  type StatusOptionManagerProps,
  type StatusOptionFormProps,
  type StatusOptionCardProps,
  type ColorPickerProps,
} from "./StatusOptionManager";

// Prompt Configuration
export {
  PromptConfigEditor,
  PromptPreview,
  TestVariablesForm,
  type PromptConfigEditorProps,
  type PromptPreviewProps,
  type TestVariablesFormProps,
} from "./PromptConfigEditor";

// Scoring Configuration
export {
  ScoringConfigPanel,
  ScoringModeCard,
  type ScoringConfigPanelProps,
  type ScoringModeCardProps,
} from "./ScoringConfigPanel";

// Org Delegation
export {
  OrgDelegationManager,
  OrgDelegationCard,
  DelegationStats,
  type OrgDelegationManagerProps,
  type OrgDelegationCardProps,
  type DelegationStatsProps,
} from "./OrgDelegationManager";
