/**
 * SysEvalPromptsPage - System Evaluation Prompts Page
 *
 * Platform admin page for managing system-level AI prompts:
 * - Document summary prompt configuration
 * - Evaluation prompt configuration
 * - Evaluation summary prompt configuration
 * - AI provider/model selection
 * - Prompt testing
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/sys/eval/prompts/page.tsx
 * import { SysEvalPromptsPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <SysEvalPromptsPage />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import { useSysEvalPrompts } from "../hooks";
import { PromptConfigEditor } from "../components";
import type { PromptType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface SysEvalPromptsPageProps {
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
        Default AI Prompts
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Configure the default AI prompts used for document evaluation. These settings
        can be overridden by organizations with delegation enabled.
      </p>
    </div>
  );
}

// =============================================================================
// PROMPT TAB NAVIGATION
// =============================================================================

interface TabNavigationProps {
  activeTab: PromptType;
  onTabChange: (tab: PromptType) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: PromptType; label: string; description: string }> = [
    {
      id: "doc_summary",
      label: "Document Summary",
      description: "Generates summaries for individual documents",
    },
    {
      id: "evaluation",
      label: "Evaluation",
      description: "Evaluates criteria against document content",
    },
    {
      id: "eval_summary",
      label: "Evaluation Summary",
      description: "Generates overall evaluation summary",
    },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Prompt Types">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              group whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }
            `}
          >
            <span>{tab.label}</span>
            <span
              className={`block text-xs mt-0.5 ${
                activeTab === tab.id
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500"
              }`}
            >
              {tab.description}
            </span>
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
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Failed to load prompts
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

export function SysEvalPromptsPage({
  className = "",
  loadingComponent,
}: SysEvalPromptsPageProps) {
  // State
  const [activeTab, setActiveTab] = useState<PromptType>("doc_summary");

  // Hooks
  const {
    prompts,
    isLoading,
    error,
    updatePrompt,
    testPrompt,
    refresh,
  } = useSysEvalPrompts();

  // Get current prompt config
  const currentPrompt = prompts?.find((p) => p.promptType === activeTab);

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
          isSystemLevel
        />
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          About AI Prompts
        </h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>
            <strong>Document Summary:</strong> Used to generate concise summaries of uploaded documents.
          </li>
          <li>
            <strong>Evaluation:</strong> Used to evaluate each criteria item against the document content with RAG context.
          </li>
          <li>
            <strong>Evaluation Summary:</strong> Used to generate the overall compliance assessment after all criteria are evaluated.
          </li>
        </ul>
        <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
          Organizations with AI delegation enabled can override these prompts with their own configurations.
        </p>
      </div>
    </div>
  );
}

export default SysEvalPromptsPage;
