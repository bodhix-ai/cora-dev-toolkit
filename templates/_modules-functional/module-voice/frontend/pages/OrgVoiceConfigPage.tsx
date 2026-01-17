/**
 * OrgVoiceConfigPage - Organization Voice Interview Configuration Page
 *
 * Org admin page for managing organization-level voice interview settings:
 * - Interview configurations (templates for different interview types)
 * - Analytics overview and session statistics
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/voice/page.tsx
 * import { OrgVoiceConfigPage } from '@/modules/module-voice/frontend/pages';
 * export default function Page() {
 *   return <OrgVoiceConfigPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import { useVoiceConfigs } from "../hooks";
import { ConfigForm } from "../components";
import type { VoiceConfig, VoiceConfigInput } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgVoiceConfigPageProps {
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

function PageHeader({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Voice Interview Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage interview configurations and view analytics for your organization.
        </p>
      </div>
      <button
        onClick={onCreateNew}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        New Configuration
      </button>
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
  action?: React.ReactNode;
}

function Section({ title, description, children, action }: SectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {action}
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
// CONFIG LIST COMPONENT
// =============================================================================

interface ConfigListProps {
  configs: VoiceConfig[];
  onEdit: (config: VoiceConfig) => void;
  onDelete: (configId: string) => void;
}

function ConfigList({ configs, onEdit, onDelete }: ConfigListProps) {
  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No interview configurations yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {configs.map((config) => (
        <div
          key={config.id}
          className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {config.name}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  config.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {config.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
              Type: {config.interviewType} {config.description && `• ${config.description}`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(config)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Edit configuration"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => onDelete(config.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete configuration"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// CONFIG DIALOG COMPONENT
// =============================================================================

interface ConfigDialogProps {
  isOpen: boolean;
  config: VoiceConfig | null;
  onSave: (data: VoiceConfigInput) => Promise<void>;
  onClose: () => void;
}

function ConfigDialog({ isOpen, config, onSave, onClose }: ConfigDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl m-4">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {config ? "Edit Configuration" : "New Configuration"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <ConfigForm
            initialData={config || undefined}
            onSubmit={async (data) => {
              await onSave(data);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OrgVoiceConfigPage({
  orgId,
  className = "",
  loadingComponent,
}: OrgVoiceConfigPageProps) {
  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<VoiceConfig | null>(null);

  // Hooks
  const {
    configs,
    isLoading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    refresh,
  } = useVoiceConfigs(orgId);

  // Handlers
  const handleCreateNew = useCallback(() => {
    setEditingConfig(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((config: VoiceConfig) => {
    setEditingConfig(config);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (configId: string) => {
      if (window.confirm("Are you sure you want to delete this configuration?")) {
        await deleteConfig(configId);
      }
    },
    [deleteConfig]
  );

  const handleSave = useCallback(
    async (data: VoiceConfigInput) => {
      if (editingConfig) {
        await updateConfig(editingConfig.id, data);
      } else {
        await createConfig(data);
      }
    },
    [editingConfig, createConfig, updateConfig]
  );

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingConfig(null);
  }, []);

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
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Page Header */}
      <PageHeader onCreateNew={handleCreateNew} />

      {/* Interview Configurations */}
      <Section
        title="Interview Configurations"
        description="Configure templates for different types of voice interviews."
      >
        <ConfigList
          configs={configs || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Section>

      {/* Info Banner */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-gray-200">Note:</strong>{" "}
          Interview configurations define the settings used by the AI interviewer,
          including voice settings, transcription options, and interview structure.
          Each configuration can be used for multiple interview sessions.
        </p>
      </div>

      {/* Config Dialog */}
      <ConfigDialog
        isOpen={isDialogOpen}
        config={editingConfig}
        onSave={handleSave}
        onClose={handleCloseDialog}
      />
    </div>
  );
}

export default OrgVoiceConfigPage;
