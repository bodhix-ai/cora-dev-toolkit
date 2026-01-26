/**
 * EvalListPage - Evaluation List Page
 *
 * Main page for viewing and managing evaluations within a workspace.
 * Features:
 * - Evaluation list with filtering and sorting
 * - Create new evaluation button
 * - Bulk actions (export, delete)
 * - Real-time progress tracking for processing evaluations
 *
 * @example
 * // In Next.js app router: app/(workspace)/[orgSlug]/[wsSlug]/eval/page.tsx
 * import { EvalListPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <EvalListPage />;
 * }
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Paper,
  Skeleton,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Error as ErrorIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  useEvaluations,
  useEvalDocTypes,
  useAnyProcessing,
  useBulkExport,
} from "../hooks";
import { EvalResultsTable, EvalProgressCard } from "../components";
import type { Evaluation, EvaluationStatus, ListEvaluationsOptions } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalListPageProps {
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID (for doc types) */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Callback when evaluation is selected */
  onSelectEvaluation?: (evaluation: Evaluation) => void;
  /** Callback to navigate to create page */
  onCreateEvaluation?: () => void;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Show processing evaluations panel */
  showProcessingPanel?: boolean;
}

interface FilterState {
  status?: EvaluationStatus;
  docTypeId?: string;
  searchQuery?: string;
}

// =============================================================================
// FILTER BAR COMPONENT
// =============================================================================

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  docTypes: Array<{ id: string; name: string }>;
  onCreateClick: () => void;
}

function FilterBar({ filters, onFilterChange, docTypes, onCreateClick }: FilterBarProps) {
  const statusOptions: Array<{ value: EvaluationStatus | ""; label: string }> = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        {/* Search Input */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search evaluations..."
            value={filters.searchQuery || ""}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value || undefined })}
            aria-label="Search evaluations"
          />
        </Box>

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={filters.status || ""}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value as EvaluationStatus || undefined })}
            label="Status"
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Doc Type Filter */}
        <FormControl size="small" sx={{ minWidth: 192 }}>
          <InputLabel id="doc-type-filter-label">Document Type</InputLabel>
          <Select
            labelId="doc-type-filter-label"
            value={filters.docTypeId || ""}
            onChange={(e) => onFilterChange({ ...filters, docTypeId: e.target.value || undefined })}
            label="Document Type"
          >
            <MenuItem value="">All Document Types</MenuItem>
            {docTypes.map((docType) => (
              <MenuItem key={docType.id} value={docType.id}>
                {docType.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Create Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateClick}
          sx={{ whiteSpace: "nowrap" }}
        >
          New Evaluation
        </Button>
      </Box>
    </Paper>
  );
}

// =============================================================================
// PROCESSING PANEL COMPONENT
// =============================================================================

interface ProcessingPanelProps {
  evaluations: Evaluation[];
  onSelect: (evaluation: Evaluation) => void;
}

function ProcessingPanel({ evaluations, onSelect }: ProcessingPanelProps) {
  if (evaluations.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Processing ({evaluations.length})
      </Typography>
      <Grid container spacing={2}>
        {evaluations.map((evaluation) => (
          <Grid item xs={12} md={6} lg={4} key={evaluation.id}>
            <EvalProgressCard
              evaluation={evaluation}
              showDetails
              onClick={() => onSelect(evaluation)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// =============================================================================
// BULK ACTIONS BAR COMPONENT
// =============================================================================

interface BulkActionsBarProps {
  selectedIds: string[];
  onExportPdf: () => void;
  onExportXlsx: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isExporting: boolean;
}

function BulkActionsBar({
  selectedIds,
  onExportPdf,
  onExportXlsx,
  onDelete,
  onClearSelection,
  isExporting,
}: BulkActionsBarProps) {
  if (selectedIds.length === 0) return null;

  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      action={
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            size="small"
            onClick={onExportPdf}
            disabled={isExporting}
          >
            Export PDF
          </Button>
          <Button
            size="small"
            onClick={onExportXlsx}
            disabled={isExporting}
          >
            Export XLSX
          </Button>
          <Button
            size="small"
            color="error"
            onClick={onDelete}
          >
            Delete
          </Button>
          <Button
            size="small"
            onClick={onClearSelection}
          >
            Clear
          </Button>
        </Box>
      }
    >
      {selectedIds.length} selected
    </Alert>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          mb: 2,
          borderRadius: "50%",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DescriptionIcon sx={{ width: 32, height: 32, color: "text.secondary" }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        No evaluations yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3, maxWidth: "md" }}>
        Get started by creating your first document evaluation. Upload documents
        and evaluate them against your compliance criteria.
      </Typography>
      <Button variant="contained" onClick={onCreateClick}>
        Create Your First Evaluation
      </Button>
    </Box>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
    </Box>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          mb: 2,
          borderRadius: "50%",
          bgcolor: "error.lighter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorIcon sx={{ width: 32, height: 32, color: "error.main" }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        Failed to load evaluations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3, maxWidth: "md" }}>
        {error.message}
      </Typography>
      <Button variant="contained" onClick={onRetry}>
        Try Again
      </Button>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EvalListPage({
  workspaceId,
  orgId,
  className = "",
  onSelectEvaluation,
  onCreateEvaluation,
  emptyState,
  loadingComponent,
  showProcessingPanel = true,
}: EvalListPageProps) {
  // Get auth token
  const { authAdapter } = useUser();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchToken() {
      try {
        const t = await authAdapter.getToken();
        if (mounted) setToken(t);
      } catch (error) {
        console.error("Failed to get auth token:", error);
        if (mounted) setToken(null);
      }
    }
    fetchToken();
    return () => { mounted = false; };
  }, [authAdapter]);

  // State
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Hooks
  const {
    evaluations,
    isLoading: evaluationsLoading,
    error,
    refresh,
    remove: deleteEvaluation,
  } = useEvaluations(token, workspaceId, {
    status: filters.status,
    docTypeId: filters.docTypeId,
  });

  const { docTypes } = useEvalDocTypes(token, orgId);
  const { isAnyProcessing, stopAllPolling } = useAnyProcessing();
  const { exportAllPdf, exportAllXlsx, isExporting } = useBulkExport(token, workspaceId);

  // Combined loading state
  const isLoading = evaluationsLoading || !token;

  // Filter evaluations by search query (client-side)
  const filteredEvaluations = React.useMemo(() => {
    if (!filters.searchQuery) return evaluations;
    const query = filters.searchQuery.toLowerCase();
    return evaluations.filter(
      (e) =>
        e.docTypeName?.toLowerCase().includes(query) ||
        e.evalSummary?.toLowerCase().includes(query)
    );
  }, [evaluations, filters.searchQuery]);

  // Get processing evaluations for panel
  const processingEvaluations = React.useMemo(
    () => evaluations.filter((e) => e.status === 'processing' || e.status === 'pending'),
    [evaluations]
  );

  // Handlers
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleSelectEvaluation = useCallback(
    (evaluation: Evaluation) => {
      onSelectEvaluation?.(evaluation);
    },
    [onSelectEvaluation]
  );

  const handleCreateClick = useCallback(() => {
    onCreateEvaluation?.();
  }, [onCreateEvaluation]);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleExportPdf = useCallback(async () => {
    await exportAllPdf(selectedIds);
  }, [exportAllPdf, selectedIds]);

  const handleExportXlsx = useCallback(async () => {
    await exportAllXlsx(selectedIds);
  }, [exportAllXlsx, selectedIds]);

  const handleDelete = useCallback(async () => {
    if (!token) return;
    if (!confirm(`Delete ${selectedIds.length} evaluation(s)?`)) return;
    for (const id of selectedIds) {
      await deleteEvaluation(id);
    }
    setSelectedIds([]);
  }, [token, deleteEvaluation, selectedIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        {loadingComponent || <LoadingState />}
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <ErrorState error={error instanceof Error ? error : new Error(error || 'Unknown error')} onRetry={refresh} />
      </Box>
    );
  }

  // Render empty state
  if (evaluations.length === 0) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        {emptyState || <EmptyState onCreateClick={handleCreateClick} />}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }} className={className}>
      {/* Page Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Evaluations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and review document compliance evaluations
          </Typography>
        </Box>
        {isAnyProcessing && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "info.main" }}>
            <CircularProgress size={16} />
            <Typography variant="body2">
              {processingEvaluations.length} processing
            </Typography>
          </Box>
        )}
      </Box>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        docTypes={docTypes.map((dt) => ({ id: dt.id, name: dt.name }))}
        onCreateClick={handleCreateClick}
      />

      {/* Processing Panel */}
      {showProcessingPanel && (
        <ProcessingPanel
          evaluations={processingEvaluations}
          onSelect={handleSelectEvaluation}
        />
      )}

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onExportPdf={handleExportPdf}
        onExportXlsx={handleExportXlsx}
        onDelete={handleDelete}
        onClearSelection={handleClearSelection}
        isExporting={isExporting}
      />

      {/* Results Table */}
      <EvalResultsTable
        evaluations={filteredEvaluations}
        onRowClick={handleSelectEvaluation}
        filters={filters}
        onFilterChange={handleFilterChange}
        docTypes={docTypes.map((dt) => ({ id: dt.id, name: dt.name }))}
      />
    </Box>
  );
}

export default EvalListPage;
