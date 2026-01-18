/**
 * OrgEvalCriteriaPage - Organization Criteria Management Page
 *
 * Org admin page for managing evaluation criteria:
 * - Create, edit, delete criteria sets
 * - Import criteria from spreadsheets
 * - Manage criteria items
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/criteria/page.tsx
 * import { OrgEvalCriteriaPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalCriteriaPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  useEvalCriteriaSets,
  useEvalDocTypes,
} from "../hooks";
import {
  CriteriaSetManager,
  CriteriaImportDialog,
  CriteriaItemEditor,
} from "../components";
import type { EvalCriteriaSet } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalCriteriaPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Pre-selected doc type ID (from navigation) */
  selectedDocTypeId?: string;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

interface PageHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

function PageHeader({ showBackButton, onBack }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-center gap-4">
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
          Evaluation Criteria
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage criteria sets and items for document evaluations.
        </p>
      </div>
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
      <div className="space-y-4">
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
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
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
        Failed to load criteria
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        {error.message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OrgEvalCriteriaPage({
  orgId,
  className = "",
  loadingComponent,
  selectedDocTypeId,
}: OrgEvalCriteriaPageProps) {
  // State
  const [filterDocTypeId, setFilterDocTypeId] = useState<string | undefined>(selectedDocTypeId);
  const [selectedSet, setSelectedSet] = useState<EvalCriteriaSet | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Hooks
  const { docTypes } = useEvalDocTypes(orgId);

  const {
    criteriaSets,
    isLoading,
    error,
    createCriteriaSet,
    updateCriteriaSet,
    deleteCriteriaSet,
    importCriteriaSet,
    refresh,
  } = useEvalCriteriaSets(orgId, { docTypeId: filterDocTypeId });

  // Handlers
  const handleDocTypeFilterChange = useCallback((docTypeId: string | undefined) => {
    setFilterDocTypeId(docTypeId);
  }, []);

  const handleSelectSet = useCallback((set: EvalCriteriaSet) => {
    setSelectedSet(set);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedSet(null);
  }, []);

  const handleCreateSet = useCallback(
    async (data: { name: string; docTypeId: string; description?: string }) => {
      await createCriteriaSet(data);
    },
    [createCriteriaSet]
  );

  const handleUpdateSet = useCallback(
    async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
      await updateCriteriaSet(id, data);
    },
    [updateCriteriaSet]
  );

  const handleDeleteSet = useCallback(
    async (id: string) => {
      await deleteCriteriaSet(id);
      if (selectedSet?.id === id) {
        setSelectedSet(null);
      }
    },
    [deleteCriteriaSet, selectedSet]
  );

  const handleOpenImport = useCallback(() => {
    setIsImportDialogOpen(true);
  }, []);

  const handleCloseImport = useCallback(() => {
    setIsImportDialogOpen(false);
  }, []);

  const handleImport = useCallback(
    async (data: { docTypeId: string; name: string; file: File }) => {
      await importCriteriaSet(data);
      setIsImportDialogOpen(false);
    },
    [importCriteriaSet]
  );

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
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  // Render criteria item editor when a set is selected
  if (selectedSet) {
    return (
      <div className={`p-6 ${className}`}>
        <PageHeader showBackButton onBack={handleBackToList} />
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {selectedSet.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedSet.description || "No description"}
          </p>
        </div>
        <CriteriaItemEditor
          criteriaSetId={selectedSet.id}
          orgId={orgId}
        />
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Page Header */}
      <PageHeader />

      {/* Criteria Set Manager */}
      <CriteriaSetManager
        criteriaSets={criteriaSets || []}
        docTypes={docTypes || []}
        onCreateSet={handleCreateSet}
        onUpdateSet={handleUpdateSet}
        onDeleteSet={handleDeleteSet}
        onSelectSet={handleSelectSet}
        onImportClick={handleOpenImport}
        selectedDocTypeId={filterDocTypeId}
        onDocTypeFilterChange={handleDocTypeFilterChange}
      />

      {/* Import Dialog */}
      <CriteriaImportDialog
        isOpen={isImportDialogOpen}
        onClose={handleCloseImport}
        onImport={handleImport}
        docTypes={docTypes || []}
      />

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          About Criteria Sets
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Criteria sets define the evaluation criteria for a document type.</li>
          <li>Import criteria from CSV or XLSX files for bulk creation.</li>
          <li>Each criteria item includes a requirement, optional description, and category.</li>
          <li>You can have multiple criteria sets per document type for different use cases.</li>
        </ul>
      </div>
    </div>
  );
}

export default OrgEvalCriteriaPage;
