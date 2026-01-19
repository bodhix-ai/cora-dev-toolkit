/**
 * EvalSummaryPanel - Evaluation Summary Display Component
 *
 * Displays the AI-generated evaluation summary with compliance score.
 * Shows document summaries and overall assessment.
 */

"use client";

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  Paper,
} from "@mui/material";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";
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
  // Safety check for null/undefined
  if (score == null) {
    return null;
  }

  // Color based on score
  const getColor = () => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const color = getColor();

  if (large) {
    return (
      <Box className={className} sx={{ textAlign: "center" }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: "50%",
            bgcolor: `${color}.lighter`,
            border: 4,
            borderColor: `${color}.main`,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: "bold",
              color: `${color}.dark`,
            }}
          >
            {score.toFixed(0)}%
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Compliance Score
        </Typography>
      </Box>
    );
  }

  return (
    <Chip
      label={`${score.toFixed(1)}%`}
      color={color as "success" | "warning" | "error"}
      size="small"
      className={className}
    />
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
      <Typography
        variant="body2"
        color="text.secondary"
        fontStyle="italic"
        className={className}
      >
        No document summaries available
      </Typography>
    );
  }

  return (
    <Box className={className}>
      {/* Combined Summary */}
      {combinedSummary && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Combined Document Summary
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {combinedSummary}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Individual Document Summaries */}
      {documents.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Document Summaries ({documents.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {documents.map((doc) => (
              <Paper key={doc.id} variant="outlined" sx={{ p: 1.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {doc.name || doc.fileName || "Untitled Document"}
                  </Typography>
                  {doc.isPrimary && (
                    <Chip label="Primary" color="primary" size="small" />
                  )}
                </Box>
                {doc.summary ? (
                  <Typography variant="body2" color="text.secondary">
                    {doc.summary}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    fontStyle="italic"
                  >
                    No summary available
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        </Box>
      )}
    </Box>
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
  const hasScore = evaluation.complianceScore != null;
  const hasSummary = !!evaluation.evalSummary;
  const hasDocSummary = !!evaluation.docSummary;

  if (!hasScore && !hasSummary && !hasDocSummary) {
    return (
      <Card className={className}>
        <CardContent>
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Typography color="text.secondary">
              {evaluation.status === "completed"
                ? "No summary available for this evaluation"
                : "Summary will be available after evaluation completes"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header with Score */}
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              Evaluation Summary
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {evaluation.name}
            </Typography>
          </Box>
          {hasScore && (
            <ComplianceScore score={evaluation.complianceScore!} large />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Summary Content */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Evaluation Summary */}
          {hasSummary && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Overall Assessment
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {evaluation.evalSummary}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Document Summary */}
          {hasDocSummary && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Document Summary
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {evaluation.docSummary}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Document Details */}
          {evaluation.documents && evaluation.documents.length > 0 && (
            <DocSummaryPanel documents={evaluation.documents} />
          )}

          {/* Metadata */}
          <Box sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" component="span">
                  Document Type:{" "}
                </Typography>
                <Typography variant="body2" fontWeight="medium" component="span">
                  {evaluation.docTypeName || evaluation.docType?.name || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" component="span">
                  Criteria Set:{" "}
                </Typography>
                <Typography variant="body2" fontWeight="medium" component="span">
                  {evaluation.criteriaSetName || evaluation.criteriaSet?.name || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" component="span">
                  Documents:{" "}
                </Typography>
                <Typography variant="body2" fontWeight="medium" component="span">
                  {evaluation.documentCount ?? evaluation.documents?.length ?? 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" component="span">
                  Completed:{" "}
                </Typography>
                <Typography variant="body2" fontWeight="medium" component="span">
                  {evaluation.completedAt
                    ? new Date(evaluation.completedAt).toLocaleString()
                    : "N/A"}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </CardContent>
    </Card>
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
      <Box className={className} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {evaluation.complianceScore !== undefined && (
          <ComplianceScore score={evaluation.complianceScore} />
        )}
        <Typography variant="body2" color="text.secondary">
          {criteriaCount} criteria • {editedCount} edited
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} className={className}>
      {/* Compliance Score */}
      <Grid item xs={6} md={3}>
        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
          {evaluation.complianceScore != null ? (
            <>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {evaluation.complianceScore.toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Compliance
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h4" fontWeight="bold" color="text.disabled">
                —
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Compliance
              </Typography>
            </>
          )}
        </Paper>
      </Grid>

      {/* Documents */}
      <Grid item xs={6} md={3}>
        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {evaluation.documentCount ?? evaluation.documents?.length ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Documents
          </Typography>
        </Paper>
      </Grid>

      {/* Criteria */}
      <Grid item xs={6} md={3}>
        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {criteriaCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Criteria
          </Typography>
        </Paper>
      </Grid>

      {/* Edited */}
      <Grid item xs={6} md={3}>
        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {editedCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Edited
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default EvalSummaryPanel;
