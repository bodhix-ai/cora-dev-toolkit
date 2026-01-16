/**
 * EvalListPage - Evaluation List Page
 *
 * Main page for viewing and managing evaluations within a workspace.
 * Features:
 * - Evaluation list with filtering and sorting
 * - Create new evaluation button
 * - Bulk actions (export, delete)
 * - Real-time progress tracking for processing evaluations
 *
 * @example
 * // In Next.js app router: app/(workspace)/[orgSlug]/[wsSlug]/eval/page.tsx
 * import { EvalListPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <EvalListPage />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  useEvaluations,
  useEvalDocTypes,
  useAnyProcessing,
  useBulkExport,
} from "../hooks";
import { EvalResultsTable, EvalProgressCard } from "../components";
import type { Evaluation, EvaluationStatus, ListEvaluationsOptions } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalListPageProps {
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID (for doc types) */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Callback when evaluation is selected */
  onSelectEvaluation?: (evaluation: Evaluation) => void;
  /** Callback to navigate to create page */
  onCreateEvaluation?: () => void;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Show processing evaluations panel */
  showProcessingPanel?: boolean;
}

interface FilterState {
  status?: EvaluationStatus;
  docTypeId?: string;
  searchQuery?: string;
}

// =============================================================================
// FILTER BAR COMPONENT
// =============================================================================

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  docTypes: Array<{ id: string; name: string }>;
  onCreateClick: () => void;
}

function FilterBar({ filters, onFilterChange, docTypes, onCreateClick }: FilterBarProps) {
  const statusOptions: Array<{ value: EvaluationStatus | ""; label: string }> = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search evaluations..."
          value={filters.searchQuery || ""}
          onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value || undefined })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Status Filter */}
      <div className="w-40">
        <select
          value={filters.status || ""}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value as EvaluationStatus || undefined })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Doc Type Filter */}
      <div className="w-48">
        <select
          value={filters.docTypeId || ""}
          onChange={(e) => onFilterChange({ ...filters, docTypeId: e.target.value || undefined })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Document Types</option>
          {docTypes.map((docType) => (
            <option key={docType.id} value={docType.id}>
              {docType.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create Button */}
      <button
        onClick={onCreateClick}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Evaluation
        </span>
      </button>
    </div>
  );
}

// =============================================================================
// PROCESSING PANEL COMPONENT
// =============================================================================

interface ProcessingPanelProps {
  evaluations: Evaluation[];
  onSelect: (evaluation: Evaluation) => void;
}

function ProcessingPanel({ evaluations, onSelect }: ProcessingPanelProps) {
  if (evaluations.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Processing ({evaluations.length})
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evaluations.map((evaluation) => (
          <EvalProgressCard
            key={evaluation.id}
            evaluationId={evaluation.id}
            title={evaluation.docTypeName || "Evaluation"}
            status={evaluation.status}
            progress={evaluation.progress}
            createdAt={evaluation.createdAt}
            onClick={() => onSelect(evaluation)}
            showTimeEstimate
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// BULK ACTIONS BAR COMPONENT
// =============================================================================

interface BulkActionsBarProps {
  selectedIds: string[];
  onExportPdf: () => void;
  onExportXlsx: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isExporting: boolean;
}

function BulkActionsBar({
  selectedIds,
  onExportPdf,
  onExportXlsx,
  onDelete,
  onClearSelection,
  isExporting,
}: BulkActionsBarProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
        {selectedIds.length} selected
      </span>
      <div className="flex-1" />
      <button
        onClick={onExportPdf}
        disabled={isExporting}
        className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-md transition-colors disabled:opacity-50"
      >
        Export PDF
      </button>
      <button
        onClick={onExportXlsx}
        disabled={isExporting}
        className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-md transition-colors disabled:opacity-50"
      >
        Export XLSX
      </button>
      <button
        onClick={onDelete}
        className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-md transition-colors"
      >
        Delete
      </button>
      <button
        onClick={onClearSelection}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No evaluations yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        Get started by creating your first document evaluation. Upload documents
        and evaluate them against your compliance criteria.
      </p>
      <button
        onClick={onCreateClick}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Create Your First Evaluation
      </button>
    </div>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Failed to load evaluations
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        {error.message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EvalListPage({
  workspaceId,
  orgId,
  className = "",
  onSelectEvaluation,
  onCreateEvaluation,
  emptyState,
  loadingComponent,
  showProcessingPanel = true,
}: EvalListPageProps) {
  // State
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Hooks
  const {
    evaluations,
    isLoading,
    error,
    refresh,
    deleteEvaluation,
  } = useEvaluations(workspaceId, {
    status: filters.status,
    docTypeId: filters.docTypeId,
  });

  const { docTypes } = useEvalDocTypes(orgId);
  const { isAnyProcessing, processingIds } = useAnyProcessing();
  const { exportPdf, exportXlsx, isExporting } = useBulkExport(workspaceId);

  // Filter evaluations by search query (client-side)
  const filteredEvaluations = React.useMemo(() => {
    if (!filters.searchQuery) return evaluations;
    const query = filters.searchQuery.toLowerCase();
    return evaluations.filter(
      (e) =>
        e.docTypeName?.toLowerCase().includes(query) ||
        e.evalSummary?.toLowerCase().includes(query)
    );
  }, [evaluations, filters.searchQuery]);

  // Get processing evaluations for panel
  const processingEvaluations = React.useMemo(
    () => evaluations.filter((e) => processingIds.includes(e.id)),
    [evaluations, processingIds]
  );

  // Handlers
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleSelectEvaluation = useCallback(
    (evaluation: Evaluation) => {
      onSelectEvaluation?.(evaluation);
    },
    [onSelectEvaluation]
  );

  const handleCreateClick = useCallback(() => {
    onCreateEvaluation?.();
  }, [onCreateEvaluation]);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleExportPdf = useCallback(async () => {
    await exportPdf(selectedIds);
  }, [exportPdf, selectedIds]);

  const handleExportXlsx = useCallback(async () => {
    await exportXlsx(selectedIds);
  }, [exportXlsx, selectedIds]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.length} evaluation(s)?`)) return;
    for (const id of selectedIds) {
      await deleteEvaluation(id);
    }
    setSelectedIds([]);
  }, [deleteEvaluation, selectedIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        {loadingComponent || <LoadingState />}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  // Render empty state
  if (evaluations.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        {emptyState || <EmptyState onCreateClick={handleCreateClick} />}
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Evaluations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and review document compliance evaluations
          </p>
        </div>
        {isAnyProcessing && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {processingIds.length} processing
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        docTypes={docTypes.map((dt) => ({ id: dt.id, name: dt.name }))}
        onCreateClick={handleCreateClick}
      />

      {/* Processing Panel */}
      {showProcessingPanel && (
        <ProcessingPanel
          evaluations={processingEvaluations}
          onSelect={handleSelectEvaluation}
        />
      )}

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onExportPdf={handleExportPdf}
        onExportXlsx={handleExportXlsx}
        onDelete={handleDelete}
        onClearSelection={handleClearSelection}
        isExporting={isExporting}
      />

      {/* Results Table */}
      <EvalResultsTable
        evaluations={filteredEvaluations}
        onRowClick={handleSelectEvaluation}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        showSelection
        showDocType
        showProgress
      />
    </div>
  );
}

export default EvalListPage;
