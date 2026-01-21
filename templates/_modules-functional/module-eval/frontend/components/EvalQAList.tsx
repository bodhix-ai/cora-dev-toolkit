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
  /** Custom sx prop */
  sx?: object;
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
 * Get status chip color from hex
 */
function getStatusColor(status?: StatusOption): "success" | "error" | "warning" | "info" | "default" {
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
  index,
  editable = false,
  onEdit,
  onViewCitations,
  sx = {},
}: EvalQACardProps) {
  // Card-level collapse state (collapses entire result section)
  const [cardExpanded, setCardExpanded] = useState(false);
  // Text-level expand state (for long result text)
  const [textExpanded, setTextExpanded] = useState(false);

  // Get effective result (considering edits)
  const effectiveResult = result.currentEdit?.editedResult ?? result.aiResult?.result;
  const effectiveStatusId = result.currentEdit?.editedStatusId ?? result.aiResult?.statusId;
  const effectiveStatus =
    result.effectiveStatus ?? getStatusOption(effectiveStatusId, statusOptions);
  
  // Get score value (prefer captured score, fallback to status option score)
  const effectiveScoreValue = result.currentEdit?.editedScoreValue ?? result.aiResult?.scoreValue;
  
  // Use score-based color for more consistent compliance visualization
  // Falls back to status-based color if no score available
  const badgeColor = effectiveScoreValue !== null && effectiveScoreValue !== undefined
    ? getScoreColor(effectiveScoreValue)
    : getStatusColor(effectiveStatus);

  // Citations
  const citations = result.aiResult?.citations ?? [];
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
                color="text.secondary"
                sx={{ 
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
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

          {/* Right side: Status Badge + Expand/Collapse Button - NEVER HIDE */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {effectiveStatus && (
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
                title={effectiveScoreValue !== null && effectiveScoreValue !== undefined
                  ? `Score: ${effectiveScoreValue}`
                  : undefined
                }
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
          {effectiveResult && (
            <Box sx={{ mb: 1.5, bgcolor: "grey.50", borderRadius: 1, p: 1.5 }}>
              <Box sx={{ mb: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {result.hasEdit ? "Edited Response" : "AI Response"}
                </Typography>
                {result.aiResult?.confidence !== undefined && !result.hasEdit && (
                  <Typography variant="caption" color="text.secondary">
                    Confidence: {result.aiResult.confidence}%
                  </Typography>
                )}
              </Box>
              <Typography
                variant="body2"
                color="text.primary"
                component="div"
                sx={{
                  ...((!textExpanded && effectiveResult.length > 300) && {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }),
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
                dangerouslySetInnerHTML={{ __html: markdownToHtml(effectiveResult) }}
              />
              {effectiveResult.length > 300 && (
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
  groupByCategory = false,
  editable = false,
  onEdit,
  onViewCitations,
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
            index={index}
            editable={editable}
            onEdit={() => onEdit?.(result)}
            onViewCitations={onViewCitations}
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
  statusOptions?: StatusOption[];
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
            <Typography variant="h4" fontWeight={600}>
              {stats.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Criteria
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography variant="h4" fontWeight={600}>
              {stats.withResults}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Evaluated
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography variant="h4" fontWeight={600}>
              {stats.edited}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manually Edited
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Typography variant="h4" fontWeight={600}>
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
