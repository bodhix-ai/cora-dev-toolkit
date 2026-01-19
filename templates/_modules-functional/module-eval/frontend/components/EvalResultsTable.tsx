/**
 * EvalResultsTable - Evaluation List Table Component
 *
 * Displays a table of evaluations with sorting, filtering, and actions.
 * Supports pagination and bulk operations.
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TableSortLabel,
  Chip,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Alert,
} from "@mui/material";
import {
  FileDownload as FileDownloadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from "@mui/icons-material";
import type {
  Evaluation,
  EvaluationStatus,
  ListEvaluationsOptions,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalResultsTableProps {
  /** List of evaluations */
  evaluations: Evaluation[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Pagination info */
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  /** Current filters */
  filters?: ListEvaluationsOptions;
  /** Callback when row is clicked */
  onRowClick?: (evaluation: Evaluation) => void;
  /** Callback when delete is clicked */
  onDelete?: (evaluation: Evaluation) => void;
  /** Callback when export is clicked */
  onExport?: (evaluation: Evaluation, format: "pdf" | "xlsx") => void;
  /** Callback when filters change */
  onFilterChange?: (filters: Partial<ListEvaluationsOptions>) => void;
  /** Callback to load more */
  onLoadMore?: () => void;
  /** Available doc types for filtering */
  docTypes?: Array<{ id: string; name: string }>;
  /** Custom class name */
  className?: string;
}

type SortField = "name" | "status" | "createdAt" | "complianceScore";
type SortDirection = "asc" | "desc";

// =============================================================================
// STATUS HELPERS
// =============================================================================

const statusConfig: Record<
  EvaluationStatus,
  { label: string; color: "warning" | "info" | "success" | "error" }
> = {
  pending: { label: "Pending", color: "warning" },
  processing: { label: "Processing", color: "info" },
  completed: { label: "Completed", color: "success" },
  failed: { label: "Failed", color: "error" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function EvalResultsTable({
  evaluations,
  isLoading = false,
  pagination,
  filters,
  onRowClick,
  onDelete,
  onExport,
  onFilterChange,
  onLoadMore,
  docTypes = [],
  className = "",
}: EvalResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sort evaluations
  const sortedEvaluations = useMemo(() => {
    return [...evaluations].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "complianceScore":
          comparison = (a.complianceScore ?? 0) - (b.complianceScore ?? 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [evaluations, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Handle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === evaluations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(evaluations.map((e) => e.id)));
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "success.main";
    if (score >= 60) return "warning.main";
    return "error.main";
  };

  return (
    <Box className={className}>
      {/* Filters */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={filters?.status || ""}
            label="Status"
            onChange={(e) =>
              onFilterChange?.({ status: e.target.value as EvaluationStatus || undefined })
            }
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>

        {/* Doc Type Filter */}
        {docTypes.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="doctype-filter-label">Doc Type</InputLabel>
            <Select
              labelId="doctype-filter-label"
              id="doctype-filter"
              value={filters?.docTypeId || ""}
              label="Doc Type"
              onChange={(e) =>
                onFilterChange?.({ docTypeId: e.target.value || undefined })
              }
            >
              <MenuItem value="">All</MenuItem>
              {docTypes.map((dt) => (
                <MenuItem key={dt.id} value={dt.id}>
                  {dt.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Results count */}
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {pagination
            ? `Showing ${evaluations.length} of ${pagination.total}`
            : `${evaluations.length} evaluations`}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {/* Selection checkbox */}
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedIds.size === evaluations.length && evaluations.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < evaluations.length}
                  onChange={toggleSelectAll}
                  inputProps={{ "aria-label": "Select all evaluations" }}
                />
              </TableCell>

              {/* Name */}
              <TableCell>
                <TableSortLabel
                  active={sortField === "name"}
                  direction={sortField === "name" ? sortDirection : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>

              {/* Doc Type */}
              <TableCell>Doc Type</TableCell>

              {/* Status */}
              <TableCell>
                <TableSortLabel
                  active={sortField === "status"}
                  direction={sortField === "status" ? sortDirection : "asc"}
                  onClick={() => handleSort("status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>

              {/* Score */}
              <TableCell>
                <TableSortLabel
                  active={sortField === "complianceScore"}
                  direction={sortField === "complianceScore" ? sortDirection : "asc"}
                  onClick={() => handleSort("complianceScore")}
                >
                  Score
                </TableSortLabel>
              </TableCell>

              {/* Created */}
              <TableCell>
                <TableSortLabel
                  active={sortField === "createdAt"}
                  direction={sortField === "createdAt" ? sortDirection : "asc"}
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                </TableSortLabel>
              </TableCell>

              {/* Actions */}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && evaluations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading evaluations...</Typography>
                </TableCell>
              </TableRow>
            ) : evaluations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No evaluations found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedEvaluations.map((evaluation) => {
                const status = statusConfig[evaluation.status];
                const isSelected = selectedIds.has(evaluation.id);

                return (
                  <TableRow
                    key={evaluation.id}
                    hover={!!onRowClick}
                    selected={isSelected}
                    onClick={() => onRowClick?.(evaluation)}
                    sx={{
                      cursor: onRowClick ? "pointer" : "default",
                    }}
                  >
                    {/* Selection */}
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(evaluation.id)}
                        inputProps={{ "aria-label": `Select ${evaluation.name}` }}
                      />
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {evaluation.name}
                      </Typography>
                      {evaluation.documentCount !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          {evaluation.documentCount} document{evaluation.documentCount !== 1 ? "s" : ""}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Doc Type */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {evaluation.docTypeName || "—"}
                      </Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={
                          evaluation.status === "processing" && evaluation.progress !== undefined
                            ? `${status.label} (${evaluation.progress}%)`
                            : status.label
                        }
                        color={status.color}
                        size="small"
                      />
                    </TableCell>

                    {/* Score */}
                    <TableCell>
                      {evaluation.complianceScore !== undefined ? (
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          sx={{ color: getScoreColor(evaluation.complianceScore) }}
                        >
                          {evaluation.complianceScore.toFixed(1)}%
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Created */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(evaluation.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                        {onExport && evaluation.status === "completed" && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => onExport(evaluation, "pdf")}
                              title="Export PDF"
                              color="primary"
                            >
                              <PdfIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => onExport(evaluation, "xlsx")}
                              title="Export Excel"
                              color="success"
                            >
                              <ExcelIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                        {onDelete && (
                          <IconButton
                            size="small"
                            onClick={() => onDelete(evaluation)}
                            title="Delete"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Load More */}
      {pagination?.hasMore && onLoadMore && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outlined"
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </Box>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Alert
          severity="info"
          sx={{ mt: 3 }}
          action={
            <>
              <Button
                size="small"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              {onDelete && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    // Handle bulk delete
                    selectedIds.forEach((id) => {
                      const eval_ = evaluations.find((e) => e.id === id);
                      if (eval_) onDelete(eval_);
                    });
                    setSelectedIds(new Set());
                  }}
                >
                  Delete Selected
                </Button>
              )}
            </>
          }
        >
          {selectedIds.size} evaluation{selectedIds.size !== 1 ? "s" : ""} selected
        </Alert>
      )}
    </Box>
  );
}

export default EvalResultsTable;
