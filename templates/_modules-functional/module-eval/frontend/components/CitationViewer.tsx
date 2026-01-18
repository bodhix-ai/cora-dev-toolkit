/**
 * CitationViewer - Citation Display Component
 *
 * Displays RAG-sourced citations from evaluation results.
 * Shows source excerpts with relevance scores and navigation.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
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
  /** Custom sx prop */
  sx?: object;
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
  /** Custom sx prop */
  sx?: object;
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
  sx = {},
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

  // Get relevance color
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "success.main";
    if (score >= 0.5) return "warning.main";
    return "text.secondary";
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "grey.50",
        p: 1.5,
        ...sx,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={index + 1}
            size="small"
            sx={{
              height: 24,
              minWidth: 24,
              bgcolor: "primary.lighter",
              color: "primary.main",
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          />
          {citation.source && (
            <Typography variant="body2" fontWeight={500}>
              {citation.source}
            </Typography>
          )}
          {citation.pageNumber !== undefined && (
            <Typography variant="caption" color="text.secondary">
              Page {citation.pageNumber}
            </Typography>
          )}
        </Box>

        {showRelevance && citation.relevanceScore !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Relevance:
            </Typography>
            <Typography
              variant="caption"
              fontWeight={500}
              sx={{ color: getRelevanceColor(citation.relevanceScore) }}
            >
              {(citation.relevanceScore * 100).toFixed(0)}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Citation Text */}
      <Box
        component="blockquote"
        sx={{
          borderLeft: 2,
          borderColor: "primary.light",
          pl: 1.5,
          m: 0,
        }}
      >
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          &ldquo;{displayText}&rdquo;
        </Typography>
      </Box>

      {/* Expand/Collapse */}
      {hasToggle && citation.text.length > 200 && (
        <Button
          onClick={toggleExpand}
          size="small"
          sx={{ mt: 1, fontSize: "0.75rem" }}
        >
          {isExpanded ? "Show less" : "Show more"}
        </Button>
      )}

      {/* Chunk info */}
      {citation.chunkIndex !== undefined && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
          Chunk #{citation.chunkIndex}
        </Typography>
      )}
    </Box>
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
  sx = {},
}: CitationViewerProps) {
  const [showAll, setShowAll] = useState(false);

  if (citations.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={sx}>
        No citations available
      </Typography>
    );
  }

  const displayCitations = showAll ? citations : citations.slice(0, initialLimit);
  const hasMore = citations.length > initialLimit;

  return (
    <Box sx={sx}>
      {/* Header */}
      <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" color="text.primary">
          Citations ({citations.length})
        </Typography>
        {hasMore && (
          <Button
            onClick={() => setShowAll(!showAll)}
            size="small"
            sx={{ fontSize: "0.75rem" }}
          >
            {showAll ? "Show fewer" : `Show all (${citations.length})`}
          </Button>
        )}
      </Box>

      {/* Citations List */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {displayCitations.map((citation, index) => (
          <CitationCard
            key={`citation-${index}`}
            citation={citation}
            index={index}
            showRelevance={showRelevance}
          />
        ))}
      </Box>

      {/* Show More Button (alternative style) */}
      {!showAll && hasMore && (
        <Box sx={{ mt: 1.5, textAlign: "center" }}>
          <Button onClick={() => setShowAll(true)} size="small">
            + {citations.length - initialLimit} more citation
            {citations.length - initialLimit !== 1 ? "s" : ""}
          </Button>
        </Box>
      )}
    </Box>
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
  /** Custom sx prop */
  sx?: object;
}

/**
 * Inline citation marker (superscript number)
 */
export function InlineCitation({
  index,
  citation,
  onClick,
  sx = {},
}: InlineCitationProps) {
  return (
    <Box
      component="button"
      onClick={onClick}
      title={citation?.text?.substring(0, 100)}
      sx={{
        display: "inline-flex",
        height: 16,
        minWidth: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        bgcolor: "primary.lighter",
        px: 0.5,
        fontSize: "0.625rem",
        fontWeight: 500,
        color: "primary.main",
        border: "none",
        cursor: "pointer",
        verticalAlign: "super",
        "&:hover": {
          bgcolor: "primary.light",
        },
        ...sx,
      }}
    >
      {index}
    </Box>
  );
}

// =============================================================================
// CITATION TOOLTIP COMPONENT
// =============================================================================

export interface CitationTooltipProps {
  /** Citation data */
  citation: Citation;
  /** Custom sx prop */
  sx?: object;
}

/**
 * Citation tooltip/popover content
 */
export function CitationTooltip({ citation, sx = {} }: CitationTooltipProps) {
  return (
    <Box
      sx={{
        maxWidth: 400,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        p: 1.5,
        boxShadow: 3,
        ...sx,
      }}
    >
      <Typography
        component="blockquote"
        variant="body2"
        color="text.secondary"
        fontStyle="italic"
        sx={{ m: 0 }}
      >
        &ldquo;{citation.text.substring(0, 200)}
        {citation.text.length > 200 ? "..." : ""}&rdquo;
      </Typography>
      <Box
        sx={{
          mt: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {citation.source && (
          <Typography variant="caption" color="text.secondary">
            {citation.source}
          </Typography>
        )}
        {citation.pageNumber !== undefined && (
          <Typography variant="caption" color="text.secondary">
            Page {citation.pageNumber}
          </Typography>
        )}
        {citation.relevanceScore !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {(citation.relevanceScore * 100).toFixed(0)}% relevance
          </Typography>
        )}
      </Box>
    </Box>
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
  /** Custom sx prop */
  sx?: object;
}

/**
 * Compact citation summary (e.g., "3 citations from 2 sources")
 */
export function CitationSummary({
  citations,
  onViewAll,
  sx = {},
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        ...sx,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {citations.length} citation{citations.length !== 1 ? "s" : ""} from {sourceCount}{" "}
        source{sourceCount !== 1 ? "s" : ""}
      </Typography>
      {avgRelevance > 0 && (
        <Typography variant="caption" color="text.disabled">
          ({(avgRelevance * 100).toFixed(0)}% avg relevance)
        </Typography>
      )}
      {onViewAll && (
        <Button
          onClick={onViewAll}
          size="small"
          sx={{ fontSize: "0.75rem", textDecoration: "underline" }}
        >
          View
        </Button>
      )}
    </Box>
  );
}

export default CitationViewer;
