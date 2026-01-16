/**
 * OrgEvalDocTypesPage - Organization Document Types Page
 *
 * Org admin page for managing document types:
 * - Create, edit, delete document types
 * - View associated criteria sets
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/doc-types/page.tsx
 * import { OrgEvalDocTypesPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalDocTypesPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useCallback } from "react";
import { useEvalDocTypes } from "../hooks";
import { DocTypeManager } from "../components";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalDocTypesPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Callback when navigating to criteria for a doc type */
  onNavigateToCriteria?: (docTypeId: string) => void;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Document Types
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage document types for your organization. Each document type can have
        associated criteria sets for evaluation.
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Failed to load document types
      </h3>
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

export function OrgEvalDocTypesPage({
  orgId,
  className = "",
  loadingComponent,
  onNavigateToCriteria,
}: OrgEvalDocTypesPageProps) {
  // Hooks
  const {
    docTypes,
    isLoading,
    error,
    createDocType,
    updateDocType,
    deleteDocType,
    refresh,
  } = useEvalDocTypes(orgId);

  // Handlers
  const handleCreateDocType = useCallback(
    async (data: { name: string; description?: string }) => {
      await createDocType(data);
    },
    [createDocType]
  );

  const handleUpdateDocType = useCallback(
    async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
      await updateDocType(id, data);
    },
    [updateDocType]
  );

  const handleDeleteDocType = useCallback(
    async (id: string) => {
      await deleteDocType(id);
    },
    [deleteDocType]
  );

  const handleViewCriteria = useCallback(
    (docTypeId: string) => {
      onNavigateToCriteria?.(docTypeId);
    },
    [onNavigateToCriteria]
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

  return (
    <div className={`p-6 ${className}`}>
      {/* Page Header */}
      <PageHeader />

      {/* Doc Type Manager */}
      <DocTypeManager
        docTypes={docTypes || []}
        onCreateDocType={handleCreateDocType}
        onUpdateDocType={handleUpdateDocType}
        onDeleteDocType={handleDeleteDocType}
        onViewCriteria={onNavigateToCriteria ? handleViewCriteria : undefined}
      />

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          About Document Types
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Document types categorize the documents your organization evaluates.</li>
          <li>Each document type can have multiple criteria sets for different evaluation scenarios.</li>
          <li>Deactivating a document type hides it from users but preserves existing evaluations.</li>
        </ul>
      </div>
    </div>
  );
}

export default OrgEvalDocTypesPage;
