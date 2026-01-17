/**
 * EvalProgressCard - Evaluation Progress Display Component
 *
 * Shows real-time progress of an evaluation being processed.
 * Displays status, progress bar, and time estimates.
 */

"use client";

import React from "react";
import type { Evaluation, EvaluationStatus } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalProgressCardProps {
  /** Evaluation object */
  evaluation: Evaluation;
  /** Show detailed progress info */
  showDetails?: boolean;
  /** Callback when card is clicked */
  onClick?: (evaluation: Evaluation) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const statusConfig: Record<
  EvaluationStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  pending: {
    label: "Pending",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: "⏳",
  },
  processing: {
    label: "Processing",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "⚙️",
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "✓",
  },
  failed: {
    label: "Failed",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "✗",
  },
};

/**
 * Format duration from milliseconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate elapsed time
 */
function getElapsedTime(startedAt?: string): string {
  if (!startedAt) return "--";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return formatDuration(now - start);
}

/**
 * Calculate estimated remaining time
 */
function getEstimatedRemaining(progress: number, startedAt?: string): string {
  if (!startedAt || progress <= 0 || progress >= 100) return "--";

  const start = new Date(startedAt).getTime();
  const elapsed = Date.now() - start;
  const estimatedTotal = elapsed / (progress / 100);
  const remaining = estimatedTotal - elapsed;

  return formatDuration(remaining);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EvalProgressCard({
  evaluation,
  showDetails = true,
  onClick,
  className = "",
}: EvalProgressCardProps) {
  const status = statusConfig[evaluation.status];
  const isActive = evaluation.status === "pending" || evaluation.status === "processing";
  const isClickable = !!onClick;

  return (
    <div
      className={`
        rounded-lg border p-4 transition-shadow
        ${isClickable ? "cursor-pointer hover:shadow-md" : ""}
        ${className}
      `}
      onClick={() => onClick?.(evaluation)}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.(evaluation);
        }
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{evaluation.name}</h3>
          <p className="text-sm text-gray-500 truncate">
            {evaluation.docTypeName || "Unknown Document Type"}
          </p>
        </div>
        <div
          className={`
            ml-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${status.bgColor} ${status.color}
          `}
        >
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="mb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`
                h-full transition-all duration-300 ease-out
                ${evaluation.status === "processing" ? "bg-blue-500" : "bg-yellow-500"}
              `}
              style={{ width: `${evaluation.progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>{evaluation.progress}% complete</span>
            {evaluation.status === "processing" && (
              <span>
                Est. remaining: {getEstimatedRemaining(evaluation.progress, evaluation.startedAt)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Completed Score */}
      {evaluation.status === "completed" && evaluation.complianceScore !== undefined && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-gray-600">Compliance Score:</span>
          <span
            className={`
              font-semibold
              ${evaluation.complianceScore >= 80 ? "text-green-600" : ""}
              ${evaluation.complianceScore >= 60 && evaluation.complianceScore < 80 ? "text-yellow-600" : ""}
              ${evaluation.complianceScore < 60 ? "text-red-600" : ""}
            `}
          >
            {evaluation.complianceScore.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Error Message */}
      {evaluation.status === "failed" && evaluation.errorMessage && (
        <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">
          {evaluation.errorMessage}
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="border-t pt-3 mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <span className="font-medium">Documents:</span>{" "}
              {evaluation.documentCount ?? evaluation.documents?.length ?? 0}
            </div>
            <div>
              <span className="font-medium">Criteria Set:</span>{" "}
              {evaluation.criteriaSetName || "N/A"}
            </div>
            {isActive && evaluation.startedAt && (
              <>
                <div>
                  <span className="font-medium">Elapsed:</span>{" "}
                  {getElapsedTime(evaluation.startedAt)}
                </div>
                <div>
                  <span className="font-medium">Started:</span>{" "}
                  {new Date(evaluation.startedAt).toLocaleTimeString()}
                </div>
              </>
            )}
            {evaluation.status === "completed" && evaluation.completedAt && (
              <div className="col-span-2">
                <span className="font-medium">Completed:</span>{" "}
                {new Date(evaluation.completedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

export interface EvalProgressCardCompactProps {
  /** Evaluation object */
  evaluation: Evaluation;
  /** Callback when card is clicked */
  onClick?: (evaluation: Evaluation) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Compact progress card for list views
 */
export function EvalProgressCardCompact({
  evaluation,
  onClick,
  className = "",
}: EvalProgressCardCompactProps) {
  const status = statusConfig[evaluation.status];
  const isActive = evaluation.status === "pending" || evaluation.status === "processing";
  const isClickable = !!onClick;

  return (
    <div
      className={`
        flex items-center gap-3 rounded border p-2 transition-colors
        ${isClickable ? "cursor-pointer hover:bg-gray-50" : ""}
        ${className}
      `}
      onClick={() => onClick?.(evaluation)}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.(evaluation);
        }
      }}
    >
      {/* Status Icon */}
      <div
        className={`
          flex h-8 w-8 items-center justify-center rounded-full text-sm
          ${status.bgColor} ${status.color}
        `}
      >
        {status.icon}
      </div>

      {/* Name and Progress */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{evaluation.name}</div>
        {isActive && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${evaluation.progress}%` }}
            />
          </div>
        )}
        {evaluation.status === "completed" && evaluation.complianceScore !== undefined && (
          <div className="text-xs text-gray-500">
            Score: {evaluation.complianceScore.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Progress Percentage */}
      {isActive && (
        <div className="text-sm font-medium text-gray-600">{evaluation.progress}%</div>
      )}
    </div>
  );
}

// =============================================================================
// PROGRESS LIST
// =============================================================================

export interface EvalProgressListProps {
  /** Evaluations to display */
  evaluations: Evaluation[];
  /** Use compact variant */
  compact?: boolean;
  /** Callback when evaluation is clicked */
  onEvaluationClick?: (evaluation: Evaluation) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom class name */
  className?: string;
}

/**
 * List of progress cards
 */
export function EvalProgressList({
  evaluations,
  compact = false,
  onEvaluationClick,
  emptyMessage = "No evaluations",
  className = "",
}: EvalProgressListProps) {
  if (evaluations.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {evaluations.map((evaluation) =>
        compact ? (
          <EvalProgressCardCompact
            key={evaluation.id}
            evaluation={evaluation}
            onClick={onEvaluationClick}
          />
        ) : (
          <EvalProgressCard
            key={evaluation.id}
            evaluation={evaluation}
            onClick={onEvaluationClick}
          />
        )
      )}
    </div>
  );
}

export default EvalProgressCard;
