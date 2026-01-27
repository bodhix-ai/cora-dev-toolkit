/**
 * EvalSummaryPanel - Evaluation Summary Display Component
 *
 * Displays the AI-generated evaluation summary with compliance score.
 * Shows document summaries and overall assessment.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  Paper,
  IconButton,
  Collapse,
  Link,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import type { Evaluation, EvaluationDocument } from "../types";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert Markdown to HTML
 * Handles common markdown patterns: headings, bold, italic, lists
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Normalize line endings
  html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Convert headings (must happen before paragraph processing)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold (must happen before italic to avoid conflicts)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Convert italic (after bold)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Convert unordered lists
  const listItems = html.match(/^[\s]*[-*]\s+.+$/gm);
  if (listItems) {
    html = html.replace(/^([\s]*[-*]\s+.+$\n?)+/gm, (match) => {
      const items = match.split('\n').filter(line => line.trim());
      const listHtml = items.map(item => {
        const content = item.replace(/^[\s]*[-*]\s+/, '');
        return `<li>${content}</li>`;
      }).join('');
      return `<ul>${listHtml}</ul>\n`;
    });
  }
  
  // Convert numbered lists
  const numberedItems = html.match(/^\d+\.\s+.+$/gm);
  if (numberedItems) {
    html = html.replace(/^(\d+\.\s+.+$\n?)+/gm, (match) => {
      const items = match.split('\n').filter(line => line.trim());
      const listHtml = items.map(item => {
        const content = item.replace(/^\d+\.\s+/, '');
        return `<li>${content}</li>`;
      }).join('');
      return `<ol>${listHtml}</ol>\n`;
    });
  }
  
  // Convert paragraphs (split by double newline)
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map(para => {
      para = para.trim();
      // Don't wrap if already wrapped in HTML tags
      if (para.match(/^<(h[1-6]|ul|ol|li|div|p)/)) {
        return para;
      }
      // Don't wrap empty paragraphs
      if (!para) {
        return '';
      }
      return `<p>${para}</p>`;
    })
    .filter(p => p)
    .join('\n');
  
  return html;
}

// Helper extractFirstParagraph removed as collapsed preview is no longer used

// =============================================================================
// TYPES
// =============================================================================

export interface EvalSummaryPanelProps {
  /** Evaluation data */
  evaluation: Evaluation;
  /** Custom class name */
  className?: string;
  /** Callback when document is clicked (for Issue A7) */
  onDocumentClick?: (documentId: string) => void;
  /** External control for expanding all sections */
  expandAll?: boolean;
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
            variant="h2"
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
// COLLAPSIBLE EVAL SUMMARY COMPONENT
// =============================================================================

/**
 * Collapsible evaluation summary with Markdown rendering
 */
function CollapsibleEvalSummary({ 
  evalSummary, 
  isExpanded 
}: { 
  evalSummary: string;
  isExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  // Sync with external control
  React.useEffect(() => {
    if (isExpanded !== undefined) {
      setExpanded(isExpanded);
    }
  }, [isExpanded]);
  
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h3" color="text.primary" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Evaluation Overview
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          aria-label={expanded ? "Collapse overview" : "Expand overview"}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
          <Typography
            variant="body2"
            component="div"
            sx={{
              "& p": { margin: "0.5em 0", "&:first-of-type": { marginTop: 0 }, "&:last-of-type": { marginBottom: 0 } },
              "& h1": { fontSize: "1.5em", fontWeight: 600, margin: "0.5em 0" },
              "& h2": { fontSize: "1.3em", fontWeight: 600, margin: "0.5em 0" },
              "& h3": { fontSize: "1.1em", fontWeight: 600, margin: "0.5em 0" },
              "& h4": { fontSize: "1em", fontWeight: 600, margin: "0.5em 0" },
              "& ul, & ol": { marginLeft: "1.5em", marginTop: "0.5em", marginBottom: "0.5em" },
              "& li": { marginBottom: "0.25em" },
              "& strong": { fontWeight: 600 },
              "& em": { fontStyle: "italic" },
            }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(evalSummary) }}
          />
        </Paper>
      </Collapse>
    </Box>
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
 * Collapsible details section
 */
function CollapsibleDetails({ 
  evaluation, 
  onDocumentClick,
  isExpanded
}: { 
  evaluation: Evaluation;
  onDocumentClick?: (documentId: string) => void;
  isExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  // Sync with external control
  React.useEffect(() => {
    if (isExpanded !== undefined) {
      setExpanded(isExpanded);
    }
  }, [isExpanded]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h3" color="text.primary" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Evaluation Inputs
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          aria-label={expanded ? "Collapse evaluation inputs" : "Expand evaluation inputs"}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Document Type
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {evaluation.docTypeName || evaluation.docType?.name || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Criteria Set
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {evaluation.criteriaSetName || evaluation.criteriaSet?.name || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Documents
              </Typography>
              {evaluation.documents && evaluation.documents.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {evaluation.documents?.map((doc: any, index: number) => (
                    <React.Fragment key={doc.id}>
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => onDocumentClick?.(doc.id)}
                        sx={{
                          fontWeight: 'medium',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': {
                            textDecoration: 'none',
                          },
                        }}
                      >
                        {doc.fileName || doc.name || doc.documentId || `Document ${index + 1}`}
                      </Link>
                      {index < (evaluation.documents?.length ?? 0) - 1 && (
                        <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                          ,
                        </Typography>
                      )}
                    </React.Fragment>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" fontWeight="medium">
                  {evaluation.documentCount ?? 0}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {evaluation.completedAt
                  ? new Date(evaluation.completedAt).toLocaleString()
                  : "N/A"}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>
    </Box>
  );
}

/**
 * Collapsible document summary
 */
function CollapsibleDocSummary({ docSummary }: { docSummary: string }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Document Summary
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          aria-label={expanded ? "Collapse document summary" : "Expand document summary"}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
          <Typography
            variant="body2"
            component="div"
            sx={{
              "& p": { margin: "0.5em 0", "&:first-of-type": { marginTop: 0 }, "&:last-of-type": { marginBottom: 0 } },
              "& h1": { fontSize: "1.5em", fontWeight: 600, margin: "0.5em 0" },
              "& h2": { fontSize: "1.3em", fontWeight: 600, margin: "0.5em 0" },
              "& h3": { fontSize: "1.1em", fontWeight: 600, margin: "0.5em 0" },
              "& h4": { fontSize: "1em", fontWeight: 600, margin: "0.5em 0" },
              "& ul, & ol": { marginLeft: "1.5em", marginTop: "0.5em", marginBottom: "0.5em" },
              "& li": { marginBottom: "0.25em" },
              "& strong": { fontWeight: 600 },
              "& em": { fontStyle: "italic" },
            }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(docSummary) }}
          />
        </Paper>
      </Collapse>
    </Box>
  );
}

/**
 * Displays the overall evaluation summary
 */
export function EvalSummaryPanel({
  evaluation,
  className = "",
  onDocumentClick,
  expandAll,
}: EvalSummaryPanelProps) {
  const hasSummary = !!evaluation.evalSummary;

  if (!hasSummary) {
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
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* 1. Evaluation Inputs (collapsible) */}
          <CollapsibleDetails 
            evaluation={evaluation} 
            onDocumentClick={onDocumentClick} 
            isExpanded={expandAll}
          />

          {/* 2. Evaluation Overview (collapsible) */}
          {hasSummary && (
            <CollapsibleEvalSummary 
              evalSummary={evaluation.evalSummary!} 
              isExpanded={expandAll}
            />
          )}
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
