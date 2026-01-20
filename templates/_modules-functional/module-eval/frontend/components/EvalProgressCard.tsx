/**
 * EvalProgressCard - Evaluation Progress Display Component
 *
 * Shows real-time progress of an evaluation being processed.
 * Displays status, progress bar, and time estimates.
 */

"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Grid,
} from "@mui/material";
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
  /** Custom sx prop */
  sx?: object;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const statusConfig: Record<
  EvaluationStatus,
  { label: string; color: "warning" | "info" | "success" | "error"; icon: string }
> = {
  draft: {
    label: "Draft",
    color: "info",
    icon: "📝",
  },
  pending: {
    label: "Pending",
    color: "warning",
    icon: "⏳",
  },
  processing: {
    label: "Processing",
    color: "info",
    icon: "⚙️",
  },
  completed: {
    label: "Completed",
    color: "success",
    icon: "✓",
  },
  failed: {
    label: "Failed",
    color: "error",
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

/**
 * Get score color
 */
function getScoreColor(score: number): string {
  if (score >= 80) return "success.main";
  if (score >= 60) return "warning.main";
  return "error.main";
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EvalProgressCard({
  evaluation,
  showDetails = true,
  onClick,
  sx = {},
}: EvalProgressCardProps) {
  // Handle missing or undefined status gracefully
  const status = evaluation.status ? statusConfig[evaluation.status] : statusConfig["draft"];
  const isActive = evaluation.status === "pending" || evaluation.status === "processing";
  const isClickable = !!onClick;

  return (
    <Card
      sx={{
        cursor: isClickable ? "pointer" : "default",
        transition: "box-shadow 0.2s",
        "&:hover": isClickable
          ? {
              boxShadow: 4,
            }
          : {},
        ...sx,
      }}
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
      <CardContent>
        {/* Header */}
        <Box sx={{ mb: 1.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={500} noWrap>
              {evaluation.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {evaluation.docTypeName || "Unknown Document Type"}
            </Typography>
          </Box>
          <Chip
            icon={<span>{status.icon}</span>}
            label={status.label}
            color={status.color}
            size="small"
            sx={{ ml: 1.5 }}
          />
        </Box>

        {/* Progress Bar */}
        {isActive && (
          <Box sx={{ mb: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={evaluation.progress}
              color={evaluation.status === "processing" ? "primary" : "warning"}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Box sx={{ mt: 0.5, display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                {evaluation.progress}% complete
              </Typography>
              {evaluation.status === "processing" && (
                <Typography variant="caption" color="text.secondary">
                  Est. remaining: {getEstimatedRemaining(evaluation.progress, evaluation.startedAt)}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Completed Score */}
        {evaluation.status === "completed" && evaluation.complianceScore !== undefined && (
          <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Compliance Score:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: getScoreColor(evaluation.complianceScore) }}
            >
              {evaluation.complianceScore.toFixed(1)}%
            </Typography>
          </Box>
        )}

        {/* Error Message */}
        {evaluation.status === "failed" && evaluation.errorMessage && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {evaluation.errorMessage}
          </Alert>
        )}

        {/* Details */}
        {showDetails && (
          <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5, mt: 1.5 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  <Box component="span" fontWeight={500}>
                    Documents:
                  </Box>{" "}
                  {evaluation.documentCount ?? evaluation.documents?.length ?? 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  <Box component="span" fontWeight={500}>
                    Criteria Set:
                  </Box>{" "}
                  {evaluation.criteriaSetName || "N/A"}
                </Typography>
              </Grid>
              {isActive && evaluation.startedAt && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      <Box component="span" fontWeight={500}>
                        Elapsed:
                      </Box>{" "}
                      {getElapsedTime(evaluation.startedAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      <Box component="span" fontWeight={500}>
                        Started:
                      </Box>{" "}
                      {new Date(evaluation.startedAt).toLocaleTimeString()}
                    </Typography>
                  </Grid>
                </>
              )}
              {evaluation.status === "completed" && evaluation.completedAt && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    <Box component="span" fontWeight={500}>
                      Completed:
                    </Box>{" "}
                    {new Date(evaluation.completedAt).toLocaleString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
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
  /** Custom sx prop */
  sx?: object;
}

/**
 * Compact progress card for list views
 */
export function EvalProgressCardCompact({
  evaluation,
  onClick,
  sx = {},
}: EvalProgressCardCompactProps) {
  // Handle missing or undefined status gracefully
  const status = evaluation.status ? statusConfig[evaluation.status] : statusConfig["draft"];
  const isActive = evaluation.status === "pending" || evaluation.status === "processing";
  const isClickable = !!onClick;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        cursor: isClickable ? "pointer" : "default",
        transition: "background-color 0.2s",
        "&:hover": isClickable
          ? {
              bgcolor: "action.hover",
            }
          : {},
        ...sx,
      }}
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
      <Chip
        icon={<span>{status.icon}</span>}
        label=""
        color={status.color}
        size="small"
        sx={{
          height: 32,
          width: 32,
          "& .MuiChip-label": { display: "none" },
        }}
      />

      {/* Name and Progress */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} noWrap>
          {evaluation.name}
        </Typography>
        {isActive && (
          <LinearProgress
            variant="determinate"
            value={evaluation.progress}
            color="primary"
            sx={{ mt: 0.5, height: 4, borderRadius: 1 }}
          />
        )}
        {evaluation.status === "completed" && evaluation.complianceScore !== undefined && (
          <Typography variant="caption" color="text.secondary">
            Score: {evaluation.complianceScore.toFixed(1)}%
          </Typography>
        )}
      </Box>

      {/* Progress Percentage */}
      {isActive && (
        <Typography variant="body2" fontWeight={500} color="text.secondary">
          {evaluation.progress}%
        </Typography>
      )}
    </Box>
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
  /** Custom sx prop */
  sx?: object;
}

/**
 * List of progress cards
 */
export function EvalProgressList({
  evaluations,
  compact = false,
  onEvaluationClick,
  emptyMessage = "No evaluations",
  sx = {},
}: EvalProgressListProps) {
  if (evaluations.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4, ...sx }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, ...sx }}>
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
    </Box>
  );
}

export default EvalProgressCard;
