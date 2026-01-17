/**
 * EvalQAList - Criteria Results List Component
 *
 * Displays evaluation criteria results as Q&A cards.
 * Shows AI results, human edits, status, and citations.
 */

"use client";

import React, { useState, useMemo } from "react";
import type {
  CriteriaResultWithItem,
  StatusOption,
  Citation,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalQAListProps {
  /** Criteria results with items */
  results: CriteriaResultWithItem[];
  /** Available status options */
  statusOptions?: StatusOption[];
  /** Whether to group by category */
  groupByCategory?: boolean;
  /** Whether results are editable */
  editable?: boolean;
  /** Callback when edit is requested */
  onEdit?: (result: CriteriaResultWithItem) => void;
  /** Callback when viewing citations */
  onViewCitations?: (citations: Citation[]) => void;
  /** Custom class name */
  className?: string;
}

export interface EvalQACardProps {
  /** Criteria result with item */
  result: CriteriaResultWithItem;
  /** Status options for lookup */
  statusOptions?: StatusOption[];
  /** Card index for display */
  index: number;
  /** Whether card is editable */
  editable?: boolean;
  /** Callback when edit is requested */
  onEdit?: () => void;
  /** Callback when viewing citations */
  onViewCitations?: (citations: Citation[]) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get status option by ID
 */
function getStatusOption(
  statusId: string | undefined,
  statusOptions?: StatusOption[]
): StatusOption | undefined {
  if (!statusId || !statusOptions) return undefined;
  return statusOptions.find((s) => s.id === statusId);
}

/**
 * Get status badge color
 */
function getStatusColor(status?: StatusOption): { bg: string; text: string } {
  if (!status?.color) {
    return { bg: "bg-gray-100", text: "text-gray-700" };
  }

  // Convert hex to tailwind-like classes (simplified)
  const color = status.color.toLowerCase();
  if (color.includes("green") || color === "#22c55e" || color === "#10b981") {
    return { bg: "bg-green-100", text: "text-green-700" };
  }
  if (color.includes("red") || color === "#ef4444" || color === "#dc2626") {
    return { bg: "bg-red-100", text: "text-red-700" };
  }
  if (color.includes("yellow") || color === "#eab308" || color === "#f59e0b") {
    return { bg: "bg-yellow-100", text: "text-yellow-700" };
  }
  if (color.includes("blue") || color === "#3b82f6" || color === "#2563eb") {
    return { bg: "bg-blue-100", text: "text-blue-700" };
  }

  return { bg: "bg-gray-100", text: "text-gray-700" };
}

// =============================================================================
// QA CARD COMPONENT
// =============================================================================

export function EvalQACard({
  result,
  statusOptions,
  index,
  editable = false,
  onEdit,
  onViewCitations,
  className = "",
}: EvalQACardProps) {
  const [expanded, setExpanded] = useState(false);

  // Get effective result (considering edits)
  const effectiveResult = result.currentEdit?.editedResult ?? result.aiResult?.result;
  const effectiveStatusId = result.currentEdit?.editedStatusId ?? result.aiResult?.statusId;
  const effectiveStatus =
    result.effectiveStatus ?? getStatusOption(effectiveStatusId, statusOptions);
  const statusColors = getStatusColor(effectiveStatus);

  // Citations
  const citations = result.aiResult?.citations ?? [];
  const hasCitations = citations.length > 0;

  return (
    <div
      className={`
        rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm
        ${className}
      `}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Index badge */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {index + 1}
          </span>

          {/* Criteria Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {result.criteriaItem.criteriaId}
              </span>
              {result.criteriaItem.category && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {result.criteriaItem.category}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-700">
              {result.criteriaItem.requirement}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {effectiveStatus && (
          <div
            className={`
              shrink-0 rounded-full px-3 py-1 text-xs font-medium
              ${statusColors.bg} ${statusColors.text}
            `}
          >
            {effectiveStatus.name}
            {result.hasEdit && (
              <span className="ml-1 text-[10px]" title="Edited">
                ✎
              </span>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      {effectiveResult && (
        <div className="mb-3 rounded bg-gray-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              {result.hasEdit ? "Edited Response" : "AI Response"}
            </span>
            {result.aiResult?.confidence !== undefined && !result.hasEdit && (
              <span className="text-xs text-gray-500">
                Confidence: {result.aiResult.confidence}%
              </span>
            )}
          </div>
          <p
            className={`
              text-sm text-gray-700
              ${!expanded && effectiveResult.length > 300 ? "line-clamp-3" : ""}
            `}
          >
            {effectiveResult}
          </p>
          {effectiveResult.length > 300 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Citations */}
          {hasCitations && (
            <button
              onClick={() => onViewCitations?.(citations)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <span>📎</span>
              <span>
                {citations.length} citation{citations.length !== 1 ? "s" : ""}
              </span>
            </button>
          )}

          {/* Weight */}
          {result.criteriaItem.weight !== 1 && (
            <span className="text-xs text-gray-500">
              Weight: {result.criteriaItem.weight}
            </span>
          )}
        </div>

        {/* Edit Button */}
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
          >
            {result.hasEdit ? "Edit Again" : "Edit"}
          </button>
        )}
      </div>

      {/* Edit History Indicator */}
      {result.hasEdit && result.currentEdit && (
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Edited by {result.currentEdit.editorName || "Unknown"} on{" "}
              {new Date(result.currentEdit.createdAt).toLocaleDateString()}
            </span>
            {result.currentEdit.editNotes && (
              <span className="italic">Note: {result.currentEdit.editNotes}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// QA LIST COMPONENT
// =============================================================================

export function EvalQAList({
  results,
  statusOptions,
  groupByCategory = false,
  editable = false,
  onEdit,
  onViewCitations,
  className = "",
}: EvalQAListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Group by category if requested
  const groupedResults = useMemo(() => {
    if (!groupByCategory) {
      return { "All Results": results };
    }

    return results.reduce(
      (groups, result) => {
        const category = result.criteriaItem.category || "Uncategorized";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(result);
        return groups;
      },
      {} as Record<string, CriteriaResultWithItem[]>
    );
  }, [results, groupByCategory]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (results.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        No criteria results available
      </div>
    );
  }

  // Flat list (no grouping)
  if (!groupByCategory) {
    return (
      <div className={`space-y-4 ${className}`}>
        {results.map((result, index) => (
          <EvalQACard
            key={result.criteriaItem.id}
            result={result}
            statusOptions={statusOptions}
            index={index}
            editable={editable}
            onEdit={() => onEdit?.(result)}
            onViewCitations={onViewCitations}
          />
        ))}
      </div>
    );
  }

  // Grouped by category
  const categories = Object.keys(groupedResults).sort();

  return (
    <div className={`space-y-6 ${className}`}>
      {categories.map((category) => {
        const categoryResults = groupedResults[category];
        const isExpanded = expandedCategories.has(category) || expandedCategories.size === 0;

        // Calculate category stats
        const completedCount = categoryResults.filter(
          (r) => r.effectiveStatus || r.aiResult?.statusId
        ).length;

        return (
          <div key={category} className="rounded-lg border">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="flex w-full items-center justify-between bg-gray-50 p-4 text-left hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                <h3 className="font-medium text-gray-900">{category}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {categoryResults.length} item{categoryResults.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {completedCount}/{categoryResults.length} evaluated
              </div>
            </button>

            {/* Category Results */}
            {isExpanded && (
              <div className="space-y-4 p-4">
                {categoryResults.map((result, index) => (
                  <EvalQACard
                    key={result.criteriaItem.id}
                    result={result}
                    statusOptions={statusOptions}
                    index={index}
                    editable={editable}
                    onEdit={() => onEdit?.(result)}
                    onViewCitations={onViewCitations}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// QA STATS COMPONENT
// =============================================================================

export interface EvalQAStatsProps {
  /** Criteria results */
  results: CriteriaResultWithItem[];
  /** Status options */
  statusOptions?: StatusOption[];
  /** Custom class name */
  className?: string;
}

/**
 * Stats summary for QA results
 */
export function EvalQAStats({
  results,
  statusOptions,
  className = "",
}: EvalQAStatsProps) {
  const stats = useMemo(() => {
    const total = results.length;
    const withResults = results.filter((r) => r.aiResult?.result).length;
    const edited = results.filter((r) => r.hasEdit).length;

    // Count by status
    const byStatus = new Map<string, number>();
    results.forEach((r) => {
      const statusId = r.currentEdit?.editedStatusId ?? r.aiResult?.statusId;
      if (statusId) {
        byStatus.set(statusId, (byStatus.get(statusId) ?? 0) + 1);
      }
    });

    // Average confidence
    const confidences = results
      .filter((r) => r.aiResult?.confidence !== undefined)
      .map((r) => r.aiResult!.confidence!);
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : null;

    return { total, withResults, edited, byStatus, avgConfidence };
  }, [results]);

  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
        <div className="text-xs text-gray-500">Total Criteria</div>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="text-2xl font-semibold text-gray-900">{stats.withResults}</div>
        <div className="text-xs text-gray-500">Evaluated</div>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="text-2xl font-semibold text-gray-900">{stats.edited}</div>
        <div className="text-xs text-gray-500">Manually Edited</div>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="text-2xl font-semibold text-gray-900">
          {stats.avgConfidence !== null ? `${stats.avgConfidence.toFixed(0)}%` : "—"}
        </div>
        <div className="text-xs text-gray-500">Avg Confidence</div>
      </div>

      {/* Status breakdown */}
      {statusOptions && stats.byStatus.size > 0 && (
        <div className="col-span-full mt-2">
          <div className="text-xs font-medium text-gray-700 mb-2">By Status:</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(stats.byStatus.entries()).map(([statusId, count]) => {
              const status = statusOptions.find((s) => s.id === statusId);
              const colors = getStatusColor(status);
              return (
                <span
                  key={statusId}
                  className={`rounded-full px-2 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {status?.name || "Unknown"}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EvalQAList;
