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

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            {tab.label}
            <span
              className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// =============================================================================
// HEADER COMPONENT
// =============================================================================

interface HeaderProps {
  title: string;
  status: string;
  onBack?: () => void;
  showBackButton: boolean;
  onExportPdf: () => void;
  onExportXlsx: () => void;
  isExporting: boolean;
}

function Header({
  title,
  status,
  onBack,
  showBackButton,
  onExportPdf,
  onExportXlsx,
  isExporting,
}: HeaderProps) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <EvalExportButton
          onExportPdf={onExportPdf}
          onExportXlsx={onExportXlsx}
          isExporting={isExporting}
        />
      </div>
    </div>
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
    <div className="flex flex-col items-center justify-center py-16">
      <EvalProgressCard
        evaluationId={evaluationId}
        title="Processing Evaluation"
        status={status as any}
        progress={progress}
        showTimeEstimate
        className="max-w-md w-full"
      />
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        Your evaluation is being processed. This page will automatically update
        when processing is complete.
      </p>
    </div>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Failed to load evaluation
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        {error.message}
      </p>
      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        )}
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
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
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No documents in this evaluation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-medium text-gray-900 dark:text-gray-100">{doc.name}</h2>
                {doc.pageCount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.pageCount} pages
                  </p>
                )}
              </div>
            </div>
          </div>
          {doc.summary && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{doc.summary}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EvalDetailPage({
  evaluationId,
  workspaceId,
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
  } = useEvaluation(workspaceId, evaluationId);

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

  const handleExportPdf = useCallback(async () => {
    const result = await exportPdf();
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    }
  }, [exportPdf]);

  const handleExportXlsx = useCallback(async () => {
    const result = await exportXlsx();
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    }
  }, [exportXlsx]);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        {loadingComponent || <LoadingState />}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorState error={error} onRetry={refresh} onBack={onBack} />
      </div>
    );
  }

  // Render not found state
  if (!evaluation) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorState
          error={new Error("Evaluation not found")}
          onRetry={refresh}
          onBack={onBack}
        />
      </div>
    );
  }

  // Render processing state
  if (isProcessing || evaluation.status === "processing" || evaluation.status === "pending") {
    return (
      <div className={`p-6 ${className}`}>
        <Header
          title={evaluation.docTypeName || "Evaluation"}
          status={evaluation.status}
          onBack={onBack}
          showBackButton={showBackButton}
          onExportPdf={handleExportPdf}
          onExportXlsx={handleExportXlsx}
          isExporting={isExporting}
        />
        <ProcessingState
          evaluationId={evaluationId}
          progress={progress || evaluation.progress}
          status={evaluation.status}
        />
      </div>
    );
  }

  // Collect all citations from results
  const allCitations: Citation[] = citations || results?.flatMap((r) => r.aiCitations || []) || [];

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <Header
        title={evaluation.docTypeName || "Evaluation"}
        status={evaluation.status}
        onBack={onBack}
        showBackButton={showBackButton}
        onExportPdf={handleExportPdf}
        onExportXlsx={handleExportXlsx}
        isExporting={isExporting}
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
      <div className="min-h-[400px]">
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
      </div>

      {/* Edit Dialog */}
      {editingResult && (
        <ResultEditDialog
          result={editingResult}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
          isOpen={true}
        />
      )}
    </div>
  );
}

export default EvalDetailPage;
