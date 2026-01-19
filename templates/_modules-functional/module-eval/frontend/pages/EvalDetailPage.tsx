/**
 * EvalDetailPage - Evaluation Detail Page
 *
 * Detailed view of a single evaluation with:
 * - Document summaries
 * - Criteria results with Q&A format
 * - Citations viewer
 * - Result editing
 * - Export options
 *
 * @example
 * // In Next.js app router: app/(workspace)/[orgSlug]/[wsSlug]/eval/[evalId]/page.tsx
 * import { EvalDetailPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page({ params }: { params: { evalId: string } }) {
 *   return <EvalDetailPage evaluationId={params.evalId} />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Button,
  Paper,
  Skeleton,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import {
  useEvaluation,
  useEvalProgress,
  useEvalExport,
} from "../hooks";
import {
  EvalProgressCard,
  EvalSummaryPanel,
  EvalQAList,
  CitationViewer,
  ResultEditDialog,
  EvalExportButton,
} from "../components";
import type { EvalCriteriaResult, Citation, CriteriaResultWithItem } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalDetailPageProps {
  /** Evaluation ID */
  evaluationId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Auth token */
  token: string | null;
  /** Optional CSS class */
  className?: string;
  /** Callback to navigate back */
  onBack?: () => void;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Show back button */
  showBackButton?: boolean;
}

type ViewTab = "results" | "citations" | "documents";

// =============================================================================
// TAB NAVIGATION COMPONENT
// =============================================================================

interface TabNavigationProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  resultCount: number;
  citationCount: number;
  documentCount: number;
}

function TabNavigation({
  activeTab,
  onTabChange,
  resultCount,
  citationCount,
  documentCount,
}: TabNavigationProps) {
  const tabs: Array<{ id: ViewTab; label: string; count: number }> = [
    { id: "results", label: "Criteria Results", count: resultCount },
    { id: "citations", label: "Citations", count: citationCount },
    { id: "documents", label: "Documents", count: documentCount },
  ];

  const handleChange = (_event: React.SyntheticEvent, newValue: ViewTab) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={activeTab} onChange={handleChange} aria-label="evaluation tabs">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {tab.label}
                <Chip
                  label={tab.count}
                  size="small"
                  color={activeTab === tab.id ? "primary" : "default"}
                  sx={{ height: 20, fontSize: "0.75rem" }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}

// =============================================================================
// HEADER COMPONENT
// =============================================================================

interface HeaderProps {
  title: string;
  status: string;
  evaluation: any;
  onBack?: () => void;
  showBackButton: boolean;
  onExport: (evaluationId: string, format: "pdf" | "xlsx") => Promise<void>;
}

function Header({
  title,
  status,
  evaluation,
  onBack,
  showBackButton,
  onExport,
}: HeaderProps) {
  const statusColors: Record<string, "warning" | "info" | "success" | "error"> = {
    pending: "warning",
    processing: "info",
    completed: "success",
    failed: "error",
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {showBackButton && onBack && (
          <IconButton onClick={onBack} sx={{ color: "text.secondary" }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={statusColors[status] || "default"}
              size="small"
            />
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <EvalExportButton
          evaluation={evaluation}
          onExport={onExport}
        />
      </Box>
    </Box>
  );
}

// =============================================================================
// PROCESSING STATE COMPONENT
// =============================================================================

interface ProcessingStateProps {
  evaluationId: string;
  progress: number;
  status: string;
}

function ProcessingState({ evaluationId, progress, status }: ProcessingStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
      }}
    >
      <EvalProgressCard
        evaluationId={evaluationId}
        title="Processing Evaluation"
        status={status as any}
        progress={progress}
        showTimeEstimate
        sx={{ maxWidth: "md", width: "100%" }}
      />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 3, textAlign: "center", maxWidth: "md" }}
      >
        Your evaluation is being processed. This page will automatically update
        when processing is complete.
      </Typography>
    </Box>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 1 }} />
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
  onBack?: () => void;
}

function ErrorState({ error, onRetry, onBack }: ErrorStateProps) {
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
        Failed to load evaluation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3, maxWidth: "md" }}>
        {error.message}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {onBack && (
          <Button variant="outlined" onClick={onBack}>
            Go Back
          </Button>
        )}
        <Button variant="contained" onClick={onRetry}>
          Try Again
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// DOCUMENTS TAB COMPONENT
// =============================================================================

interface DocumentsTabProps {
  documents: Array<{
    id: string;
    name: string;
    summary?: string;
    pageCount?: number;
    createdAt?: string;
  }>;
}

function DocumentsTab({ documents }: DocumentsTabProps) {
  if (documents.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="body2" color="text.secondary">
          No documents in this evaluation.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {documents.map((doc) => (
        <Paper key={doc.id} variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  bgcolor: "primary.lighter",
                }}
              >
                <DescriptionIcon sx={{ width: 20, height: 20, color: "primary.main" }} />
              </Box>
              <Box>
                <Typography variant="subtitle2">{doc.name}</Typography>
                {doc.pageCount && (
                  <Typography variant="caption" color="text.secondary">
                    {doc.pageCount} pages
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          {doc.summary && (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                {doc.summary}
              </Typography>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EvalDetailPage({
  evaluationId,
  workspaceId,
  token,
  className = "",
  onBack,
  loadingComponent,
  showBackButton = true,
}: EvalDetailPageProps) {
  // State
  const [activeTab, setActiveTab] = useState<ViewTab>("results");
  const [editingResult, setEditingResult] = useState<CriteriaResultWithItem | null>(null);

  // Hooks
  const {
    evaluation,
    results,
    documents,
    citations,
    isLoading,
    error,
    refresh,
    editResult,
  } = useEvaluation(token, workspaceId, evaluationId);

  const { progress, isProcessing } = useEvalProgress(evaluationId);
  const { exportPdf, exportXlsx, isExporting } = useEvalExport(workspaceId, evaluationId);

  // Handlers
  const handleTabChange = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
  }, []);

  const handleEditResult = useCallback((result: CriteriaResultWithItem) => {
    setEditingResult(result);
  }, []);

  const handleSaveEdit = useCallback(async (resultId: string, data: { editedResult: string; editedStatusId: string; editNotes?: string }) => {
    await editResult(resultId, data);
    setEditingResult(null);
  }, [editResult]);

  const handleCloseEdit = useCallback(() => {
    setEditingResult(null);
  }, []);

  const handleExport = useCallback(async (evaluationId: string, format: "pdf" | "xlsx") => {
    const exportFn = format === "pdf" ? exportPdf : exportXlsx;
    const result = await exportFn();
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    }
  }, [exportPdf, exportXlsx]);

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
        <ErrorState error={error} onRetry={refresh} onBack={onBack} />
      </Box>
    );
  }

  // Render not found state
  if (!evaluation) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <ErrorState
          error={new Error("Evaluation not found")}
          onRetry={refresh}
          onBack={onBack}
        />
      </Box>
    );
  }

  // Render processing state
  if (isProcessing || evaluation.status === "processing" || evaluation.status === "pending") {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <Header
          title={evaluation.docTypeName || "Evaluation"}
          status={evaluation.status}
          evaluation={evaluation}
          onBack={onBack}
          showBackButton={showBackButton}
          onExport={handleExport}
        />
        <ProcessingState
          evaluationId={evaluationId}
          progress={progress || evaluation.progress}
          status={evaluation.status}
        />
      </Box>
    );
  }

  // Collect all citations from results
  const allCitations: Citation[] = citations || results?.flatMap((r) => r.aiCitations || []) || [];

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }} className={className}>
      {/* Header */}
      <Header
        title={evaluation.docTypeName || "Evaluation"}
        status={evaluation.status}
        evaluation={evaluation}
        onBack={onBack}
        showBackButton={showBackButton}
        onExport={handleExport}
      />

      {/* Summary Panel */}
      <EvalSummaryPanel
        evaluation={evaluation}
        documents={documents}
        showDocSummaries
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        resultCount={results?.length || 0}
        citationCount={allCitations.length}
        documentCount={documents?.length || 0}
      />

      {/* Tab Content */}
      <Box sx={{ minHeight: 400 }}>
        {activeTab === "results" && (
          <EvalQAList
            results={results || []}
            onEditResult={handleEditResult}
            showCategories
            showConfidence
            showEditButton
          />
        )}

        {activeTab === "citations" && (
          <CitationViewer
            citations={allCitations}
            showDocumentLinks
          />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            documents={documents?.map((d) => ({
              id: d.id,
              name: d.fileName || d.documentId,
              summary: d.summary,
            })) || []}
          />
        )}
      </Box>

      {/* Edit Dialog */}
      {editingResult && (
        <ResultEditDialog
          result={editingResult}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
          isOpen={true}
        />
      )}
    </Box>
  );
}

export default EvalDetailPage;
