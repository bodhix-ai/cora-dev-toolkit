/**
 * EvalSummaryPanel - Evaluation Summary Display Component
 *
 * Displays the AI-generated evaluation summary with compliance score.
 * Shows document summaries and overall assessment.
 */

"use client";

import React from "react";
import type { Evaluation, EvaluationDocument } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalSummaryPanelProps {
  /** Evaluation data */
  evaluation: Evaluation;
  /** Custom class name */
  className?: string;
}

export interface DocSummaryPanelProps {
  /** Documents with summaries */
  documents: EvaluationDocument[];
  /** Combined document summary */
  combinedSummary?: string;
  /** Custom class name */
  className?: string;
}

export interface ComplianceScoreProps {
  /** Compliance score (0-100) */
  score: number;
  /** Show as large display */
  large?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// COMPLIANCE SCORE COMPONENT
// =============================================================================

/**
 * Compliance score display with color coding
 */
export function ComplianceScore({
  score,
  large = false,
  className = "",
}: ComplianceScoreProps) {
  // Color based on score
  const getColors = () => {
    if (score >= 80) return { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-500" };
    if (score >= 60) return { bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-yellow-500" };
    return { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-500" };
  };

  const colors = getColors();

  if (large) {
    return (
      <div className={`text-center ${className}`}>
        <div
          className={`
            inline-flex h-24 w-24 items-center justify-center rounded-full
            ${colors.bg} ring-4 ${colors.ring}
          `}
        >
          <span className={`text-3xl font-bold ${colors.text}`}>
            {score.toFixed(0)}%
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-gray-600">Compliance Score</p>
      </div>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
        ${colors.bg} ${colors.text}
        ${className}
      `}
    >
      {score.toFixed(1)}%
    </span>
  );
}

// =============================================================================
// DOCUMENT SUMMARY PANEL
// =============================================================================

/**
 * Displays document summaries
 */
export function DocSummaryPanel({
  documents,
  combinedSummary,
  className = "",
}: DocSummaryPanelProps) {
  if (documents.length === 0 && !combinedSummary) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No document summaries available
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Combined Summary */}
      {combinedSummary && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Combined Document Summary
          </h4>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {combinedSummary}
            </p>
          </div>
        </div>
      )}

      {/* Individual Document Summaries */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Document Summaries ({documents.length})
          </h4>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {doc.name || doc.fileName || "Untitled Document"}
                  </span>
                  {doc.isPrimary && (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      Primary
                    </span>
                  )}
                </div>
                {doc.summary ? (
                  <p className="text-sm text-gray-600">{doc.summary}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No summary available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EVALUATION SUMMARY PANEL
// =============================================================================

/**
 * Displays the overall evaluation summary
 */
export function EvalSummaryPanel({
  evaluation,
  className = "",
}: EvalSummaryPanelProps) {
  const hasScore = evaluation.complianceScore !== undefined;
  const hasSummary = !!evaluation.evalSummary;
  const hasDocSummary = !!evaluation.docSummary;

  if (!hasScore && !hasSummary && !hasDocSummary) {
    return (
      <div className={`rounded-lg border p-6 text-center ${className}`}>
        <p className="text-gray-500">
          {evaluation.status === "completed"
            ? "No summary available for this evaluation"
            : "Summary will be available after evaluation completes"}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header with Score */}
      <div className="border-b p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Evaluation Summary
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {evaluation.name}
            </p>
          </div>
          {hasScore && (
            <ComplianceScore score={evaluation.complianceScore!} large />
          )}
        </div>
      </div>

      {/* Summary Content */}
      <div className="p-6 space-y-6">
        {/* Evaluation Summary */}
        {hasSummary && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Overall Assessment
            </h4>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {evaluation.evalSummary}
              </p>
            </div>
          </div>
        )}

        {/* Document Summary */}
        {hasDocSummary && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Document Summary
            </h4>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {evaluation.docSummary}
              </p>
            </div>
          </div>
        )}

        {/* Document Details */}
        {evaluation.documents && evaluation.documents.length > 0 && (
          <DocSummaryPanel documents={evaluation.documents} />
        )}

        {/* Metadata */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Document Type:</span>
              <span className="ml-2 font-medium text-gray-900">
                {evaluation.docTypeName || evaluation.docType?.name || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Criteria Set:</span>
              <span className="ml-2 font-medium text-gray-900">
                {evaluation.criteriaSetName || evaluation.criteriaSet?.name || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Documents:</span>
              <span className="ml-2 font-medium text-gray-900">
                {evaluation.documentCount ?? evaluation.documents?.length ?? 0}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Completed:</span>
              <span className="ml-2 font-medium text-gray-900">
                {evaluation.completedAt
                  ? new Date(evaluation.completedAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUMMARY STATS COMPONENT
// =============================================================================

export interface SummaryStatsProps {
  /** Evaluation data */
  evaluation: Evaluation;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Quick stats display for evaluation
 */
export function SummaryStats({
  evaluation,
  compact = false,
  className = "",
}: SummaryStatsProps) {
  const criteriaCount = evaluation.criteriaResults?.length ?? 0;
  const editedCount = evaluation.criteriaResults?.filter((r) => r.hasEdit).length ?? 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-4 text-sm ${className}`}>
        {evaluation.complianceScore !== undefined && (
          <ComplianceScore score={evaluation.complianceScore} />
        )}
        <span className="text-gray-500">
          {criteriaCount} criteria • {editedCount} edited
        </span>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
      {/* Compliance Score */}
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        {evaluation.complianceScore !== undefined ? (
          <>
            <div className="text-2xl font-bold text-gray-900">
              {evaluation.complianceScore.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Compliance</div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-400">—</div>
            <div className="text-xs text-gray-500">Compliance</div>
          </>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">
          {evaluation.documentCount ?? evaluation.documents?.length ?? 0}
        </div>
        <div className="text-xs text-gray-500">Documents</div>
      </div>

      {/* Criteria */}
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{criteriaCount}</div>
        <div className="text-xs text-gray-500">Criteria</div>
      </div>

      {/* Edited */}
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{editedCount}</div>
        <div className="text-xs text-gray-500">Edited</div>
      </div>
    </div>
  );
}

export default EvalSummaryPanel;
