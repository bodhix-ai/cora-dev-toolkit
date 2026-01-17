/**
 * EvalResultsTable - Evaluation List Table Component
 *
 * Displays a table of evaluations with sorting, filtering, and actions.
 * Supports pagination and bulk operations.
 */

"use client";

import React, { useState, useMemo } from "react";
import type {
  Evaluation,
  EvaluationStatus,
  ListEvaluationsOptions,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalResultsTableProps {
  /** List of evaluations */
  evaluations: Evaluation[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Pagination info */
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  /** Current filters */
  filters?: ListEvaluationsOptions;
  /** Callback when row is clicked */
  onRowClick?: (evaluation: Evaluation) => void;
  /** Callback when delete is clicked */
  onDelete?: (evaluation: Evaluation) => void;
  /** Callback when export is clicked */
  onExport?: (evaluation: Evaluation, format: "pdf" | "xlsx") => void;
  /** Callback when filters change */
  onFilterChange?: (filters: Partial<ListEvaluationsOptions>) => void;
  /** Callback to load more */
  onLoadMore?: () => void;
  /** Available doc types for filtering */
  docTypes?: Array<{ id: string; name: string }>;
  /** Custom class name */
  className?: string;
}

type SortField = "name" | "status" | "createdAt" | "complianceScore";
type SortDirection = "asc" | "desc";

// =============================================================================
// STATUS HELPERS
// =============================================================================

const statusConfig: Record<
  EvaluationStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: "Pending", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  processing: { label: "Processing", color: "text-blue-700", bgColor: "bg-blue-100" },
  completed: { label: "Completed", color: "text-green-700", bgColor: "bg-green-100" },
  failed: { label: "Failed", color: "text-red-700", bgColor: "bg-red-100" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function EvalResultsTable({
  evaluations,
  isLoading = false,
  pagination,
  filters,
  onRowClick,
  onDelete,
  onExport,
  onFilterChange,
  onLoadMore,
  docTypes = [],
  className = "",
}: EvalResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sort evaluations
  const sortedEvaluations = useMemo(() => {
    return [...evaluations].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "complianceScore":
          comparison = (a.complianceScore ?? 0) - (b.complianceScore ?? 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [evaluations, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Handle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === evaluations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(evaluations.map((e) => e.id)));
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-block">
      {sortField === field ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="status-filter"
            value={filters?.status || ""}
            onChange={(e) =>
              onFilterChange?.({ status: e.target.value as EvaluationStatus || undefined })
            }
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Doc Type Filter */}
        {docTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="doctype-filter" className="text-sm font-medium text-gray-700">
              Doc Type:
            </label>
            <select
              id="doctype-filter"
              value={filters?.docTypeId || ""}
              onChange={(e) =>
                onFilterChange?.({ docTypeId: e.target.value || undefined })
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">All</option>
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Results count */}
        <div className="ml-auto text-sm text-gray-500">
          {pagination
            ? `Showing ${evaluations.length} of ${pagination.total}`
            : `${evaluations.length} evaluations`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Selection checkbox */}
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === evaluations.length && evaluations.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                  aria-label="Select all evaluations"
                />
              </th>

              {/* Name */}
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("name")}
              >
                Name <SortIcon field="name" />
              </th>

              {/* Doc Type */}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Doc Type
              </th>

              {/* Status */}
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                Status <SortIcon field="status" />
              </th>

              {/* Score */}
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("complianceScore")}
              >
                Score <SortIcon field="complianceScore" />
              </th>

              {/* Created */}
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("createdAt")}
              >
                Created <SortIcon field="createdAt" />
              </th>

              {/* Actions */}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading && evaluations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading evaluations...
                </td>
              </tr>
            ) : evaluations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No evaluations found
                </td>
              </tr>
            ) : (
              sortedEvaluations.map((evaluation) => {
                const status = statusConfig[evaluation.status];
                const isSelected = selectedIds.has(evaluation.id);

                return (
                  <tr
                    key={evaluation.id}
                    className={`
                      transition-colors
                      ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                      ${isSelected ? "bg-blue-50" : ""}
                    `}
                    onClick={() => onRowClick?.(evaluation)}
                  >
                    {/* Selection */}
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(evaluation.id)}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label={`Select ${evaluation.name}`}
                      />
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{evaluation.name}</div>
                      {evaluation.documentCount !== undefined && (
                        <div className="text-xs text-gray-500">
                          {evaluation.documentCount} document{evaluation.documentCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </td>

                    {/* Doc Type */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {evaluation.docTypeName || "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`
                          inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
                          ${status.bgColor} ${status.color}
                        `}
                      >
                        {status.label}
                        {evaluation.status === "processing" && (
                          <span className="ml-1">{evaluation.progress}%</span>
                        )}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-4">
                      {evaluation.complianceScore !== undefined ? (
                        <span
                          className={`
                            font-medium
                            ${evaluation.complianceScore >= 80 ? "text-green-600" : ""}
                            ${evaluation.complianceScore >= 60 && evaluation.complianceScore < 80 ? "text-yellow-600" : ""}
                            ${evaluation.complianceScore < 60 ? "text-red-600" : ""}
                          `}
                        >
                          {evaluation.complianceScore.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {new Date(evaluation.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {onExport && evaluation.status === "completed" && (
                          <>
                            <button
                              onClick={() => onExport(evaluation, "pdf")}
                              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                              title="Export PDF"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => onExport(evaluation, "xlsx")}
                              className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                              title="Export Excel"
                            >
                              Excel
                            </button>
                          </>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(evaluation)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {pagination?.hasMore && onLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-50 p-3">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear selection
          </button>
          {onDelete && (
            <button
              onClick={() => {
                // Handle bulk delete
                selectedIds.forEach((id) => {
                  const eval_ = evaluations.find((e) => e.id === id);
                  if (eval_) onDelete(eval_);
                });
                setSelectedIds(new Set());
              }}
              className="ml-auto rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              Delete Selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EvalResultsTable;
