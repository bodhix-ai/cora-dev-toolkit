/**
 * OrgEvalConfigPage - Organization Evaluation Configuration Page
 *
 * Org admin page for managing organization-level evaluation settings:
 * - Scoring configuration (overrides system defaults)
 * - Status options management (org-specific options)
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/config/page.tsx
 * import { OrgEvalConfigPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalConfigPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useUser } from "@{project}/module-access";
import {
  useOrgEvalConfig,
  useOrgStatusOptions,
} from "../hooks";
import {
  ScoringConfigPanel,
  StatusOptionManager,
} from "../components";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalConfigPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Evaluation Settings
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Configure organization-level evaluation settings. These settings override
        platform defaults for your organization.
      </p>
    </div>
  );
}

// =============================================================================
// SECTION COMPONENT
// =============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="p-6">{children}</div>
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
      <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
        Failed to load configuration
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

export function OrgEvalConfigPage({
  orgId,
  className = "",
  loadingComponent,
}: OrgEvalConfigPageProps) {
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

  // Hooks
  const {
    config,
    isLoading: isConfigLoading,
    error: configError,
    update: updateConfig,
    refresh: refreshConfig,
  } = useOrgEvalConfig(token, orgId);

  const {
    options: statusOptions,
    isLoading: isStatusLoading,
    create: createOption,
    update: updateOption,
    remove: deleteOption,
    refresh: refreshStatus,
  } = useOrgStatusOptions(token, orgId);

  // Combined loading and error states
  const isLoading = isConfigLoading || isStatusLoading || !token;
  const error = configError;

  // Handlers
  const handleRefresh = useCallback(() => {
    refreshConfig();
    refreshStatus();
  }, [refreshConfig, refreshStatus]);

  const handleScoringUpdate = useCallback(
    async (updates: { categoricalMode?: string; showNumericalScore?: boolean }) => {
      await updateConfig(updates);
    },
    [updateConfig]
  );

  // Render loading state
  if (isLoading || !config) {
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
        <ErrorState error={error} onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Page Header */}
      <PageHeader />

      {/* Scoring Configuration */}
      <Section
        title="Scoring Configuration"
        description="Configure how evaluations are scored for your organization."
      >
        <ScoringConfigPanel
          config={{
            categoricalMode: config?.categoricalMode || "boolean",
            showNumericalScore: config?.showNumericalScore || false,
          }}
          onSave={handleScoringUpdate}
          isSystemLevel={false}
        />
      </Section>

      {/* Status Options */}
      <Section
        title="Status Options"
        description="Configure custom status options for your organization's evaluation results."
      >
        <StatusOptionManager
          statusOptions={statusOptions || []}
          onCreateOption={createOption}
          onUpdateOption={updateOption}
          onDeleteOption={deleteOption}
          isSystemLevel={false}
        />
      </Section>

      {/* Info Banner */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-gray-200">Note:</strong>{" "}
          Settings configured here will override the platform defaults for all
          workspaces in your organization. System status options will still be
          available alongside your custom options.
        </p>
      </div>
    </div>
  );
}

export default OrgEvalConfigPage;
