/**
 * CitationViewer - Citation Display Component
 *
 * Displays RAG-sourced citations from evaluation results.
 * Shows source excerpts with relevance scores and navigation.
 */

"use client";

import React, { useState } from "react";
import type { Citation } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface CitationViewerProps {
  /** List of citations */
  citations: Citation[];
  /** Whether to show relevance scores */
  showRelevance?: boolean;
  /** Maximum number of citations to show initially */
  initialLimit?: number;
  /** Custom class name */
  className?: string;
}

export interface CitationCardProps {
  /** Citation data */
  citation: Citation;
  /** Citation index/number */
  index: number;
  /** Whether to show relevance score */
  showRelevance?: boolean;
  /** Whether card is expanded */
  expanded?: boolean;
  /** Toggle expand callback */
  onToggleExpand?: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// CITATION CARD COMPONENT
// =============================================================================

/**
 * Single citation display card
 */
export function CitationCard({
  citation,
  index,
  showRelevance = true,
  expanded = false,
  onToggleExpand,
  className = "",
}: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const hasToggle = !!onToggleExpand || citation.text.length > 200;

  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // Truncate text if not expanded
  const displayText =
    isExpanded || citation.text.length <= 200
      ? citation.text
      : citation.text.substring(0, 200) + "...";

  return (
    <div
      className={`
        rounded-lg border border-gray-200 bg-gray-50 p-3
        ${className}
      `}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
            {index + 1}
          </span>
          {citation.source && (
            <span className="text-sm font-medium text-gray-700">{citation.source}</span>
          )}
          {citation.pageNumber !== undefined && (
            <span className="text-xs text-gray-500">Page {citation.pageNumber}</span>
          )}
        </div>

        {showRelevance && citation.relevanceScore !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Relevance:</span>
            <span
              className={`
                text-xs font-medium
                ${citation.relevanceScore >= 0.8 ? "text-green-600" : ""}
                ${citation.relevanceScore >= 0.5 && citation.relevanceScore < 0.8 ? "text-yellow-600" : ""}
                ${citation.relevanceScore < 0.5 ? "text-gray-600" : ""}
              `}
            >
              {(citation.relevanceScore * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Citation Text */}
      <blockquote className="border-l-2 border-blue-300 pl-3 text-sm text-gray-700 italic">
        &ldquo;{displayText}&rdquo;
      </blockquote>

      {/* Expand/Collapse */}
      {hasToggle && citation.text.length > 200 && (
        <button
          onClick={toggleExpand}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* Chunk info */}
      {citation.chunkIndex !== undefined && (
        <div className="mt-2 text-xs text-gray-400">Chunk #{citation.chunkIndex}</div>
      )}
    </div>
  );
}

// =============================================================================
// CITATION VIEWER COMPONENT
// =============================================================================

/**
 * List of citations with expand/collapse
 */
export function CitationViewer({
  citations,
  showRelevance = true,
  initialLimit = 3,
  className = "",
}: CitationViewerProps) {
  const [showAll, setShowAll] = useState(false);

  if (citations.length === 0) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No citations available
      </div>
    );
  }

  const displayCitations = showAll ? citations : citations.slice(0, initialLimit);
  const hasMore = citations.length > initialLimit;

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Citations ({citations.length})
        </h4>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showAll ? "Show fewer" : `Show all (${citations.length})`}
          </button>
        )}
      </div>

      {/* Citations List */}
      <div className="space-y-3">
        {displayCitations.map((citation, index) => (
          <CitationCard
            key={`citation-${index}`}
            citation={citation}
            index={index}
            showRelevance={showRelevance}
          />
        ))}
      </div>

      {/* Show More Button (alternative style) */}
      {!showAll && hasMore && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + {citations.length - initialLimit} more citation
            {citations.length - initialLimit !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INLINE CITATION COMPONENT
// =============================================================================

export interface InlineCitationProps {
  /** Citation index (1-based for display) */
  index: number;
  /** Citation data */
  citation?: Citation;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Inline citation marker (superscript number)
 */
export function InlineCitation({
  index,
  citation,
  onClick,
  className = "",
}: InlineCitationProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex h-4 min-w-4 items-center justify-center rounded-full
        bg-blue-100 px-1 text-[10px] font-medium text-blue-700
        hover:bg-blue-200 align-super
        ${className}
      `}
      title={citation?.text?.substring(0, 100)}
    >
      {index}
    </button>
  );
}

// =============================================================================
// CITATION TOOLTIP COMPONENT
// =============================================================================

export interface CitationTooltipProps {
  /** Citation data */
  citation: Citation;
  /** Custom class name */
  className?: string;
}

/**
 * Citation tooltip/popover content
 */
export function CitationTooltip({ citation, className = "" }: CitationTooltipProps) {
  return (
    <div
      className={`
        max-w-sm rounded-lg border bg-white p-3 shadow-lg
        ${className}
      `}
    >
      <blockquote className="text-sm text-gray-700 italic">
        &ldquo;{citation.text.substring(0, 200)}
        {citation.text.length > 200 ? "..." : ""}&rdquo;
      </blockquote>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        {citation.source && <span>{citation.source}</span>}
        {citation.pageNumber !== undefined && <span>Page {citation.pageNumber}</span>}
        {citation.relevanceScore !== undefined && (
          <span>{(citation.relevanceScore * 100).toFixed(0)}% relevance</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CITATION SUMMARY COMPONENT
// =============================================================================

export interface CitationSummaryProps {
  /** List of citations */
  citations: Citation[];
  /** Click handler to view all */
  onViewAll?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Compact citation summary (e.g., "3 citations from 2 sources")
 */
export function CitationSummary({
  citations,
  onViewAll,
  className = "",
}: CitationSummaryProps) {
  if (citations.length === 0) {
    return null;
  }

  // Count unique sources
  const uniqueSources = new Set(citations.map((c) => c.source).filter(Boolean));
  const sourceCount = uniqueSources.size || 1;

  // Calculate average relevance
  const avgRelevance =
    citations.reduce((sum, c) => sum + (c.relevanceScore ?? 0), 0) / citations.length;

  return (
    <div
      className={`
        flex items-center gap-2 text-xs text-gray-500
        ${className}
      `}
    >
      <span>
        {citations.length} citation{citations.length !== 1 ? "s" : ""} from {sourceCount}{" "}
        source{sourceCount !== 1 ? "s" : ""}
      </span>
      {avgRelevance > 0 && (
        <span className="text-gray-400">
          ({(avgRelevance * 100).toFixed(0)}% avg relevance)
        </span>
      )}
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          View
        </button>
      )}
    </div>
  );
}

export default CitationViewer;
