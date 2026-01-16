/**
 * OrgEvalPromptsPage - Organization Evaluation Prompts Page
 *
 * Org admin page for managing organization-level AI prompts (when delegated):
 * - Document summary prompt configuration
 * - Evaluation prompt configuration
 * - Evaluation summary prompt configuration
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/prompts/page.tsx
 * import { OrgEvalPromptsPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalPromptsPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import { useOrgEvalPrompts, useOrgEvalConfig } from "../hooks";
import { PromptConfigEditor } from "../components";
import type { PromptType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalPromptsPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

// =============================================================================
// NOT DELEGATED STATE COMPONENT
// =============================================================================

function NotDelegatedState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        AI Configuration Not Delegated
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        Your organization does not have AI prompt customization enabled. Contact
        your platform administrator to request delegation of AI configuration.
      </p>
    </div>
  );
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        AI Prompts
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Customize AI prompts for your organization's document evaluations.
      </p>
    </div>
  );
}

// =============================================================================
// TAB NAVIGATION COMPONENT
// =============================================================================

interface TabNavigationProps {
  activeTab: PromptType;
  onTabChange: (tab: PromptType) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: PromptType; label: string }> = [
    { id: "doc_summary", label: "Document Summary" },
    { id: "evaluation", label: "Evaluation" },
    { id: "eval_summary", label: "Evaluation Summary" },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Prompt Types">
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
          </button>
        ))}
      </nav>
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
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
        Failed to load prompts
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

export function OrgEvalPromptsPage({
  orgId,
  className = "",
  loadingComponent,
}: OrgEvalPromptsPageProps) {
  // State
  const [activeTab, setActiveTab] = useState<PromptType>("doc_summary");

  // Hooks
  const { config, isLoading: isConfigLoading } = useOrgEvalConfig(orgId);

  const {
    prompts,
    isLoading: isPromptsLoading,
    error,
    updatePrompt,
    testPrompt,
    refresh,
  } = useOrgEvalPrompts(orgId);

  // Check if delegation is enabled
  const isDelegated = config?.aiConfigDelegated === true;

  // Get current prompt config
  const currentPrompt = prompts?.find((p) => p.promptType === activeTab);

  // Combined loading state
  const isLoading = isConfigLoading || isPromptsLoading;

  // Handlers
  const handleTabChange = useCallback((tab: PromptType) => {
    setActiveTab(tab);
  }, []);

  const handleUpdatePrompt = useCallback(
    async (data: {
      systemPrompt?: string;
      userPromptTemplate?: string;
      aiProvider?: string;
      aiModel?: string;
      temperature?: number;
    }) => {
      await updatePrompt(activeTab, data);
    },
    [updatePrompt, activeTab]
  );

  const handleTestPrompt = useCallback(
    async (testInput: string) => {
      return await testPrompt(activeTab, testInput);
    },
    [testPrompt, activeTab]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        {loadingComponent || <LoadingState />}
      </div>
    );
  }

  // Render not delegated state
  if (!isDelegated) {
    return (
      <div className={`p-6 ${className}`}>
        <PageHeader />
        <NotDelegatedState />
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

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Prompt Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <PromptConfigEditor
          promptType={activeTab}
          config={currentPrompt}
          onSave={handleUpdatePrompt}
          onTest={handleTestPrompt}
          isSystemLevel={false}
        />
      </div>
    </div>
  );
}

export default OrgEvalPromptsPage;
