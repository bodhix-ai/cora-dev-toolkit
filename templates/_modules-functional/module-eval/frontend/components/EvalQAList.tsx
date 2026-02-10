/**
 * EvalQAList - Criteria Results List Component
 *
 * Displays evaluation criteria results as Q&A cards.
 * Shows AI results, human edits, status, and citations.
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Collapse,
  IconButton,
  Grid,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import type {
  CriteriaResultWithItem,
  Citation,
  ScoreConfig,
} from "../types";
import { ComplianceScoreChip, getStatusForScore } from "./ComplianceScoreChip";
import { getStatusFromScore } from "../utils/scoring";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalQAListProps {
  /** Criteria results with items */
  results: CriteriaResultWithItem[];
  /** Available status options */
  statusOptions?: Array<{ id: string; name: string; color?: string }>;
  /** Score configuration for display */
  scoreConfig?: ScoreConfig;
  /** Whether to group by category */
  groupByCategory?: boolean;
  /** Whether results are editable */
  editable?: boolean;
  /** Callback when edit is requested */
  onEdit?: (result: CriteriaResultWithItem) => void;
  /** Callback when viewing citations */
  onViewCitations?: (citations: Citation[]) => void;
  /** External control for expanding all cards */
  expandAll?: boolean;
  /** Custom sx prop */
  sx?: object;
}

export interface EvalQACardProps {
  /** Criteria result with item */
  result: CriteriaResultWithItem;
  /** Status options for lookup */
  statusOptions?: Array<{ id: string; name: string; color?: string }>;
  /** Score configuration for display */
  scoreConfig?: ScoreConfig;
  /** Card index for display */
  index: number;
  /** Whether card is editable */
  editable?: boolean;
  /** Callback when edit is requested */
  onEdit?: () => void;
  /** Callback when viewing citations */
  onViewCitations?: (citations: Citation[]) => void;
  /** External control for expanded state */
  isExpanded?: boolean;
  /** Custom sx prop */
  sx?: object;
}

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
  html = html.replace(/^## (.+)$/gm, '<h2>$2</h2>');
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

/**
 * Format a snake_case field name into a human-readable label
 */
function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Render a field value with proper formatting for different types:
 * - Arrays: rendered as bullet lists
 * - Numbered text (e.g., "1. First 2. Second"): rendered as ordered list
 * - Plain text: rendered as paragraph with markdown support
 */
function renderFieldValue(value: any): React.ReactNode {
  // Handle arrays
  if (Array.isArray(value)) {
    // Empty array — show "None" message
    if (value.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          None identified
        </Typography>
      );
    }

    // Array of objects (e.g., compliance_gaps: [{finding, recommendation}])
    // Render as a numbered table for excellent UX
    if (typeof value[0] === "object" && value[0] !== null) {
      const keys = Object.keys(value[0]);
      return (
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.875rem",
            "& th": {
              textAlign: "left",
              fontWeight: 600,
              color: "text.secondary",
              borderBottom: 2,
              borderColor: "divider",
              py: 0.75,
              px: 1,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            },
            "& td": {
              borderBottom: 1,
              borderColor: "divider",
              py: 1,
              px: 1,
              verticalAlign: "top",
            },
            "& tr:last-child td": {
              borderBottom: 0,
            },
          }}
        >
          <thead>
            <tr>
              <Box component="th" sx={{ width: 32 }}>#</Box>
              {keys.map((k) => (
                <th key={k}>{formatFieldLabel(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((row: any, i: number) => (
              <tr key={i}>
                <Box component="td" sx={{ color: "text.secondary", fontWeight: 500 }}>
                  {i + 1}
                </Box>
                {keys.map((k) => (
                  <td key={k}>
                    <Typography variant="body2" color="text.primary">
                      {String(row[k] || "")}
                    </Typography>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      );
    }

    // Array of strings — render as bullet list
    return (
      <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
        {value.map((item, i) => (
          <Typography key={i} component="li" variant="body2" color="text.primary">
            {String(item)}
          </Typography>
        ))}
      </Box>
    );
  }

  // Handle objects (nested JSON — single object, not array)
  if (typeof value === "object" && value !== null) {
    return (
      <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
        {Object.entries(value).map(([k, v]) => (
          <Typography key={k} component="li" variant="body2" color="text.primary">
            <strong>{formatFieldLabel(k)}:</strong> {String(v)}
          </Typography>
        ))}
      </Box>
    );
  }

  const text = String(value);

  // Detect numbered list pattern - handles both:
  // - Newline-separated: "1. First\n2. Second"
  // - Inline: "...sentence. 2. Next item 3. Third item"
  const numberedPattern = /(?:^|\s)\d+\.\s+/m;
  if (numberedPattern.test(text)) {
    // Split on number patterns (handles both inline and newline-separated)
    const items = text
      .split(/(?:^|\n|\s)(?=\d+\.\s)/)
      .map((item) => item.replace(/^\d+\.\s+/, "").trim())
      .filter((item) => item);
    if (items.length > 1) {
      return (
        <Box component="ol" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
          {items.map((item, i) => (
            <Typography key={i} component="li" variant="body2" color="text.primary">
              {item.trim()}
            </Typography>
          ))}
        </Box>
      );
    }
  }

  // Plain text — render with markdown support
  return (
    <Typography
      variant="body2"
      color="text.primary"
      component="div"
      sx={{
        "& p": { margin: "0.5em 0", "&:first-of-type": { marginTop: 0 }, "&:last-of-type": { marginBottom: 0 } },
        "& ul, & ol": { marginLeft: "1.5em", marginTop: "0.5em", marginBottom: "0.5em" },
        "& li": { marginBottom: "0.25em" },
        "& strong": { fontWeight: 600 },
      }}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
    />
  );
}

/**
 * Sort custom fields for display.
 * Phase 1: Uses insertion order (no hardcoded sorting).
 * Phase 2: Will use display_order from eval_opt_response_structures.
 */
function sortCustomFields(entries: [string, any][]): [string, any][] {
  // Phase 1: Return as-is (insertion order from AI response)
  // Phase 2 TODO: Accept response_structure config and sort by display_order
  return entries;
}

/**
 * Parse ai_result field (handles both legacy string and new JSONB format)
 */
interface ParsedAIResult {
  score?: number;
  confidence?: number;
  explanation: string;
  citations?: Citation[];
  customFields?: Record<string, any>;
}

function parseAIResult(aiResult: any): ParsedAIResult {
  // Handle null/undefined
  if (!aiResult) {
    return { explanation: "" };
  }

  // Legacy format: plain string
  if (typeof aiResult === "string") {
    return { explanation: aiResult };
  }

  // Legacy format: object with "result" field as string
  if (aiResult.result && typeof aiResult.result === "string") {
    return {
      explanation: aiResult.result,
      score: aiResult.scoreValue,
      confidence: aiResult.confidence,
      citations: aiResult.citations,
    };
  }

  // New JSONB format: aiResult.result is a JSONB object (not a string)
  if (aiResult.result && typeof aiResult.result === "object") {
    const { score, confidence, explanation, citations, ...customFields } = aiResult.result;
    return {
      score: typeof score === "number" ? score : aiResult.scoreValue,
      confidence: typeof confidence === "number" ? confidence : aiResult.confidence,
      explanation: explanation || "",
      citations: Array.isArray(citations) ? citations : aiResult.citations,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };
  }

  // Fallback: treat entire aiResult as the data (should not reach here with new format)
  const { score, confidence, explanation, citations, ...customFields } = aiResult;

  return {
    score: typeof score === "number" ? score : undefined,
    confidence: typeof confidence === "number" ? confidence : undefined,
    explanation: explanation || "",
    citations: Array.isArray(citations) ? citations : undefined,
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
  };
}

/**
 * Get status option by ID
 */
function getStatusOption(
  statusId: string | undefined,
  statusOptions?: Array<{ id: string; name: string; color?: string }>
): { id: string; name: string; color?: string } | undefined {
  if (!statusId || !statusOptions) return undefined;
  return statusOptions.find((s) => s.id === statusId);
}

/**
 * Get status chip color from hex
 */
function getStatusColor(status?: { id: string; name: string; color?: string }): "success" | "error" | "warning" | "info" | "default" {
  if (!status?.color) return "default";

  const color = status.color.toLowerCase();
  if (color.includes("green") || color === "#22c55e" || color === "#10b981") {
    return "success";
  }
  if (color.includes("red") || color === "#ef4444" || color === "#dc2626") {
    return "error";
  }
  if (color.includes("yellow") || color === "#eab308" || color === "#f59e0b") {
    return "warning";
  }
  if (color.includes("blue") || color === "#3b82f6" || color === "#2563eb") {
    return "info";
  }

  return "default";
}

/**
 * Get compliance color based on score value (0-100)
 * This provides consistent color coding regardless of status option configuration
 */
function getScoreColor(scoreValue?: number | string | null): "success" | "error" | "warning" | "default" {
  if (scoreValue === null || scoreValue === undefined) return "default";
  
  const score = typeof scoreValue === "string" ? parseFloat(scoreValue) : scoreValue;
  
  if (isNaN(score)) return "default";
  
  // Color coding based on compliance score ranges
  if (score >= 76) return "success";    // 76-100: Green (Compliant)
  if (score >= 51) return "warning";    // 51-75: Yellow (Mostly Compliant)
  if (score >= 26) return "warning";    // 26-50: Orange/Yellow (Partially Compliant)
  return "error";                        // 0-25: Red (Non-Compliant)
}

// =============================================================================
// QA CARD COMPONENT
// =============================================================================

export function EvalQACard({
  result,
  statusOptions,
  scoreConfig,
  index,
  editable = false,
  onEdit,
  onViewCitations,
  isExpanded: externalExpanded,
  sx = {},
}: EvalQACardProps) {
  // Card-level collapse state (collapses entire result section)
  const [cardExpanded, setCardExpanded] = useState(false);

  // Sync with external control
  React.useEffect(() => {
    if (externalExpanded !== undefined) {
      setCardExpanded(externalExpanded);
    }
  }, [externalExpanded]);
  
  // Text-level expand state (for long result text)
  const [textExpanded, setTextExpanded] = useState(false);

  // Parse AI result (handles both legacy and new JSONB format)
  const parsedAI = result.aiResult ? parseAIResult(result.aiResult) : null;

  // Get effective values (considering edits)
  const effectiveScore = result.currentEdit?.editedScoreValue ?? parsedAI?.score;
  const effectiveConfidence = parsedAI?.confidence; // Confidence is AI-only, not editable
  const effectiveExplanation = result.currentEdit?.editedResult ?? parsedAI?.explanation ?? "";
  
  // Derive status label from score using rubric (new scoring architecture)
  const effectiveStatusLabel = effectiveScore !== undefined && effectiveScore !== null
    ? getStatusFromScore(effectiveScore)
    : result.effectiveStatus?.name ?? "Not Evaluated";

  // Legacy: Get status by ID if no score available
  const effectiveStatusId = result.currentEdit?.editedStatusId ?? result.aiResult?.statusId;
  const effectiveStatus =
    result.effectiveStatus ?? getStatusOption(effectiveStatusId, statusOptions);

  // Custom fields from AI result
  const customFields = parsedAI?.customFields;
  
  // Use score-based color for more consistent compliance visualization
  // Falls back to status-based color if no score available
  const badgeColor = effectiveScore !== null && effectiveScore !== undefined
    ? getScoreColor(effectiveScore)
    : getStatusColor(effectiveStatus);

  // Citations (from parsed AI result or legacy field)
  const citations = parsedAI?.citations ?? result.aiResult?.citations ?? [];
  const hasCitations = citations.length > 0;

  return (
    <Card
      sx={{
        transition: "box-shadow 0.2s",
        "&:hover": {
          boxShadow: 2,
        },
        ...sx,
      }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Header with Collapse Control - Compact Single Row */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0, overflow: "hidden" }}>
            {/* Index badge */}
            <Chip
              label={index + 1}
              size="small"
              sx={{
                height: 28,
                minWidth: 28,
                bgcolor: "grey.100",
                color: "text.secondary",
                fontWeight: 500,
                flexShrink: 0,
              }}
            />

            {/* Criteria Info - Single Row */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0, overflow: "hidden" }}>
              <Typography variant="body2" fontWeight={500} sx={{ flexShrink: 0 }}>
                {result.criteriaItem.criteriaId}:
              </Typography>
              <Typography 
                variant="body2" 
                color={cardExpanded ? "text.primary" : "text.secondary"}
                fontWeight={cardExpanded ? 700 : 400}
                sx={{ 
                  flex: 1,
                  minWidth: 0,
                  ...(!cardExpanded && {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }),
                }}
              >
                {result.criteriaItem.requirement}
              </Typography>
              {result.criteriaItem.category && (
                <Chip
                  label={result.criteriaItem.category}
                  size="small"
                  sx={{ height: 20, fontSize: "0.75rem", flexShrink: 0, display: { xs: "none", sm: "inline-flex" } }}
                />
              )}
            </Box>
          </Box>

            {/* Right side: Score Display + Expand/Collapse Button - NEVER HIDE */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {effectiveScore !== null && effectiveScore !== undefined ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {scoreConfig ? (
                  <ComplianceScoreChip
                    score={effectiveScore}
                    config={{
                      categoricalMode: scoreConfig.categoricalMode,
                      showDecimalScore: scoreConfig.showDecimalScore,
                    }}
                    statusOptions={scoreConfig.statusOptions}
                    size="small"
                  />
                ) : (
                  <Chip
                    label={`${Math.round(effectiveScore)}% - ${effectiveStatusLabel}`}
                    color={badgeColor}
                    size="small"
                    sx={{ flexShrink: 0 }}
                  />
                )}
                {result.hasEdit && (
                  <Box component="span" sx={{ fontSize: "0.75rem", color: "text.secondary" }} title="Edited">
                    ✎
                  </Box>
                )}
              </Box>
            ) : effectiveStatus ? (
              <Chip
                label={
                  <>
                    {effectiveStatus.name}
                    {result.hasEdit && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: "0.625rem" }} title="Edited">
                        ✎
                      </Box>
                    )}
                  </>
                }
                color={badgeColor}
                size="small"
                sx={{ flexShrink: 0 }}
              />
            ) : (
              <Chip
                label="Not Evaluated"
                color="default"
                size="small"
                sx={{ flexShrink: 0 }}
              />
            )}
            
            {/* Card Expand/Collapse Button */}
            <IconButton
              onClick={() => setCardExpanded(!cardExpanded)}
              size="small"
              aria-label={cardExpanded ? "Collapse result" : "Expand result"}
              sx={{ ml: 0.5 }}
            >
              {cardExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {/* Collapsible Result Section */}
        <Collapse in={cardExpanded}>
{(effectiveExplanation || (customFields && Object.keys(customFields).length > 0)) && (
            <Box sx={{ mb: 1.5, bgcolor: "grey.50", borderRadius: 1, p: 1.5 }}>
              <Box sx={{ mb: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {result.hasEdit ? "Edited Response" : "AI Response"}
                </Typography>
                {effectiveConfidence !== undefined && !result.hasEdit && (
                  <Typography variant="caption" color="text.secondary">
                    Confidence: {effectiveConfidence}%
                  </Typography>
                )}
              </Box>

              {/* Clamp wrapper — covers explanation + custom fields together */}
              <Box
                sx={{
                  ...(!textExpanded && effectiveExplanation.length > 300 && {
                    maxHeight: "4.5em",
                    overflow: "hidden",
                    position: "relative",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "1.5em",
                      background: "linear-gradient(transparent, rgba(245,245,245,1))",
                    },
                  }),
                }}
              >
                {/* Explanation text */}
                {effectiveExplanation && (
                  <Typography
                    variant="body2"
                    color="text.primary"
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
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(effectiveExplanation) }}
                  />
                )}

                {/* Custom Fields from AI Response — inside same clamp wrapper */}
                {customFields && Object.keys(customFields).length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1.5 }}>
                    {sortCustomFields(Object.entries(customFields)).map(([key, value]) => (
                      <Box key={key}>
                        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                          {formatFieldLabel(key)}
                        </Typography>
                        {renderFieldValue(value)}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Show more/less button — applies to entire content */}
              {effectiveExplanation.length > 300 && (
                <Button
                  onClick={() => setTextExpanded(!textExpanded)}
                  size="small"
                  sx={{ mt: 0.5, fontSize: "0.75rem" }}
                >
                  {textExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </Box>
          )}

          {/* Custom Fields from AI Response */}
          {customFields && Object.keys(customFields).length > 0 && (
            <Box sx={{ mb: 1.5, bgcolor: "blue.50", borderRadius: 1, p: 1.5, borderLeft: 3, borderColor: "blue.500" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 1, display: "block" }}>
                Additional Response Sections
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Object.entries(customFields).map(([key, value]) => (
                  <Box key={key}>
                    <Typography variant="caption" fontWeight={600} color="primary" sx={{ textTransform: "capitalize" }}>
                      {key.replace(/_/g, " ")}:
                    </Typography>
                    <Typography variant="body2" color="text.primary" sx={{ mt: 0.25 }}>
                      {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {/* Citations */}
            {hasCitations && (
              <Button
                onClick={() => onViewCitations?.(citations)}
                size="small"
                startIcon={<span>📎</span>}
                sx={{ fontSize: "0.75rem" }}
              >
                {citations.length} citation{citations.length !== 1 ? "s" : ""}
              </Button>
            )}

            {/* Weight */}
            {result.criteriaItem.weight !== 1 && (
              <Typography variant="caption" color="text.secondary">
                Weight: {result.criteriaItem.weight}
              </Typography>
            )}
          </Box>

          {/* Edit Button */}
          {editable && onEdit && (
            <Button
              onClick={onEdit}
              size="small"
              sx={{ fontSize: "0.75rem" }}
            >
              {result.hasEdit ? "Edit Again" : "Edit"}
            </Button>
          )}
          </Box>

          {/* Edit History Indicator */}
          {result.hasEdit && result.currentEdit && (
            <Box sx={{ mt: 1.5, borderTop: 1, borderColor: "divider", pt: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  Edited by {result.currentEdit.editorName || "Unknown"} on{" "}
                  {new Date(result.currentEdit.createdAt).toLocaleDateString()}
                </Typography>
                {result.currentEdit.editNotes && (
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    Note: {result.currentEdit.editNotes}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QA LIST COMPONENT
// =============================================================================

export function EvalQAList({
  results,
  statusOptions,
  scoreConfig,
  groupByCategory = false,
  editable = false,
  onEdit,
  onViewCitations,
  expandAll,
  sx = {},
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
      <Box sx={{ textAlign: "center", py: 4, ...sx }}>
        <Typography variant="body2" color="text.secondary">
          No criteria results available
        </Typography>
      </Box>
    );
  }

  // Flat list (no grouping)
  if (!groupByCategory) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, ...sx }}>
        {results.map((result, index) => (
          <EvalQACard
            key={result.criteriaItem.id}
            result={result}
            statusOptions={statusOptions}
            scoreConfig={scoreConfig}
            index={index}
            editable={editable}
            onEdit={() => onEdit?.(result)}
            onViewCitations={onViewCitations}
            isExpanded={expandAll}
          />
        ))}
      </Box>
    );
  }

  // Grouped by category
  const categories = Object.keys(groupedResults).sort();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, ...sx }}>
      {categories.map((category) => {
        const categoryResults = groupedResults[category];
        const isExpanded = expandedCategories.has(category) || expandedCategories.size === 0;

        // Calculate category stats
        const completedCount = categoryResults.filter(
          (r) => r.effectiveStatus || r.aiResult?.statusId
        ).length;

        return (
          <Card key={category}>
            {/* Category Header */}
            <Box
              component="button"
              onClick={() => toggleCategory(category)}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "grey.50",
                p: 2,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background-color 0.2s",
                "&:hover": {
                  bgcolor: "grey.100",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                <Typography variant="subtitle1" fontWeight={500}>
                  {category}
                </Typography>
                <Chip
                  label={`${categoryResults.length} item${categoryResults.length !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{ height: 20, fontSize: "0.75rem" }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {completedCount}/{categoryResults.length} evaluated
              </Typography>
            </Box>

            {/* Category Results */}
            <Collapse in={isExpanded}>
              <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                {categoryResults.map((result, index) => (
                  <EvalQACard
                    key={result.criteriaItem.id}
                    result={result}
                    statusOptions={statusOptions}
                    scoreConfig={scoreConfig}
                    index={index}
                    editable={editable}
                    onEdit={() => onEdit?.(result)}
                    onViewCitations={onViewCitations}
                  />
                ))}
              </Box>
            </Collapse>
          </Card>
        );
      })}
    </Box>
  );
}

// =============================================================================
// QA STATS COMPONENT
// =============================================================================

export interface EvalQAStatsProps {
  /** Criteria results */
  results: CriteriaResultWithItem[];
  /** Status options */
  statusOptions?: Array<{ id: string; name: string; color?: string }>;
  /** Custom sx prop */
  sx?: object;
}

/**
 * Stats summary for QA results
 */
export function EvalQAStats({
  results,
  statusOptions,
  sx = {},
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
    <Box sx={sx}>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography component="div" sx={{ fontSize: '2.125rem', fontWeight: 600, lineHeight: 1.235 }}>
              {stats.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Criteria
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography component="div" sx={{ fontSize: '2.125rem', fontWeight: 600, lineHeight: 1.235 }}>
              {stats.withResults}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Evaluated
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography component="div" sx={{ fontSize: '2.125rem', fontWeight: 600, lineHeight: 1.235 }}>
              {stats.edited}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manually Edited
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography component="div" sx={{ fontSize: '2.125rem', fontWeight: 600, lineHeight: 1.235 }}>
              {stats.avgConfidence !== null ? `${stats.avgConfidence.toFixed(0)}%` : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg Confidence
            </Typography>
          </Box>
        </Grid>

        {/* Status breakdown */}
        {statusOptions && stats.byStatus.size > 0 && (
          <Grid item xs={12}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" fontWeight={500} color="text.primary" sx={{ mb: 1, display: "block" }}>
                By Status:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {Array.from(stats.byStatus.entries()).map(([statusId, count]) => {
                  const status = statusOptions.find((s) => s.id === statusId);
                  const color = getStatusColor(status);
                  return (
                    <Chip
                      key={statusId}
                      label={`${status?.name || "Unknown"}: ${count}`}
                      color={color}
                      size="small"
                    />
                  );
                })}
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default EvalQAList;
