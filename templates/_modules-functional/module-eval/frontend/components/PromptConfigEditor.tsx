/**
 * PromptConfigEditor - Prompt Configuration Editor Component
 *
 * Admin component for editing AI prompt configurations.
 * Supports system-level and org-level prompt overrides.
 */

"use client";

import React, { useState } from "react";
import type {
  EvalSysPromptConfig,
  EvalOrgPromptConfig,
  EvalMergedPromptConfig,
  PromptConfigInput,
  PromptTestResult,
  PromptType,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface PromptConfigEditorProps {
  /** Prompt type being edited */
  promptType: PromptType;
  /** Merged/effective prompt config */
  config: EvalMergedPromptConfig;
  /** System config (for reference in org view) */
  sysConfig?: EvalSysPromptConfig;
  /** Available AI providers */
  aiProviders?: { id: string; name: string }[];
  /** Available AI models for selected provider */
  aiModels?: { id: string; name: string }[];
  /** Whether editing is allowed (for org: delegation must be enabled) */
  canEdit?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether test is in progress */
  isTesting?: boolean;
  /** Test result */
  testResult?: PromptTestResult | null;
  /** Error message */
  error?: string | null;
  /** Callback when saving config */
  onSave: (input: PromptConfigInput) => Promise<void>;
  /** Callback when testing prompt */
  onTest?: (input: { systemPrompt?: string; userPromptTemplate?: string }) => Promise<PromptTestResult>;
  /** Callback when provider changes */
  onProviderChange?: (providerId: string) => void;
  /** Callback when resetting to system defaults (org level only) */
  onResetToDefault?: () => Promise<void>;
  /** Custom class name */
  className?: string;
}

export interface PromptPreviewProps {
  /** System prompt */
  systemPrompt: string;
  /** User prompt template */
  userPromptTemplate: string;
  /** Whether preview is expanded */
  isExpanded?: boolean;
  /** Toggle expansion */
  onToggle?: () => void;
}

export interface TestVariablesFormProps {
  /** Test variables */
  variables: Record<string, string>;
  /** Update variables */
  onChange: (variables: Record<string, string>) => void;
  /** Whether disabled */
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROMPT_TYPE_LABELS: Record<PromptType, string> = {
  doc_summary: "Document Summary",
  evaluation: "Criteria Evaluation",
  eval_summary: "Evaluation Summary",
};

const PROMPT_TYPE_DESCRIPTIONS: Record<PromptType, string> = {
  doc_summary: "Generates a summary of uploaded documents",
  evaluation: "Evaluates documents against each criteria item",
  eval_summary: "Generates overall evaluation summary and compliance score",
};

const DEFAULT_TEST_VARIABLES: Record<PromptType, Record<string, string>> = {
  doc_summary: {
    document_name: "IT Security Policy v2.3.pdf",
    document_content: "[Document content will be inserted here]",
  },
  evaluation: {
    criteria_id: "AC-1",
    requirement: "The organization develops, documents, and disseminates an access control policy.",
    document_context: "[RAG context will be inserted here]",
  },
  eval_summary: {
    results_summary: "[Criteria results will be inserted here]",
    total_criteria: "50",
    compliant_count: "42",
  },
};

// =============================================================================
// PROMPT PREVIEW
// =============================================================================

export function PromptPreview({
  systemPrompt,
  userPromptTemplate,
  isExpanded = false,
  onToggle,
}: PromptPreviewProps) {
  return (
    <div className="rounded-lg border bg-gray-50">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-700">Preview</span>
        <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-1">System Prompt</h3>
            <pre className="text-xs bg-white rounded border p-2 overflow-x-auto whitespace-pre-wrap text-gray-700">
              {systemPrompt || "(empty)"}
            </pre>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-1">User Prompt Template</h3>
            <pre className="text-xs bg-white rounded border p-2 overflow-x-auto whitespace-pre-wrap text-gray-700">
              {userPromptTemplate || "(empty)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TEST VARIABLES FORM
// =============================================================================

export function TestVariablesForm({
  variables,
  onChange,
  disabled = false,
}: TestVariablesFormProps) {
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No template variables detected.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <label
            htmlFor={`var-${key}`}
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            {`{{${key}}}`}
          </label>
          <input
            id={`var-${key}`}
            type="text"
            value={value}
            onChange={(e) => onChange({ ...variables, [key]: e.target.value })}
            disabled={disabled}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// PROMPT CONFIG EDITOR
// =============================================================================

export function PromptConfigEditor({
  promptType,
  config,
  sysConfig,
  aiProviders = [],
  aiModels = [],
  canEdit = true,
  isSaving = false,
  isTesting = false,
  testResult,
  error,
  onSave,
  onTest,
  onProviderChange,
  onResetToDefault,
  className = "",
}: PromptConfigEditorProps) {
  const [aiProviderId, setAiProviderId] = useState(config.aiProviderId || "");
  const [aiModelId, setAiModelId] = useState(config.aiModelId || "");
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || "");
  const [userPromptTemplate, setUserPromptTemplate] = useState(
    config.userPromptTemplate || ""
  );
  const [temperature, setTemperature] = useState(config.temperature.toString());
  const [maxTokens, setMaxTokens] = useState(config.maxTokens.toString());
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, string>>(
    DEFAULT_TEST_VARIABLES[promptType] || {}
  );
  const [showTestPanel, setShowTestPanel] = useState(false);

  const handleProviderChange = (providerId: string) => {
    setAiProviderId(providerId);
    setAiModelId(""); // Reset model when provider changes
    onProviderChange?.(providerId);
  };

  const handleSave = async () => {
    const tempNum = parseFloat(temperature);
    if (isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
      setLocalError("Temperature must be between 0 and 2");
      return;
    }

    const maxTokensNum = parseInt(maxTokens);
    if (isNaN(maxTokensNum) || maxTokensNum < 1) {
      setLocalError("Max tokens must be a positive number");
      return;
    }

    try {
      setLocalError(null);
      await onSave({
        aiProviderId: aiProviderId || undefined,
        aiModelId: aiModelId || undefined,
        systemPrompt: systemPrompt || undefined,
        userPromptTemplate: userPromptTemplate || undefined,
        temperature: tempNum,
        maxTokens: maxTokensNum,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    try {
      setLocalError(null);
      await onTest({
        systemPrompt,
        userPromptTemplate,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Test failed");
    }
  };

  const displayError = error || localError;

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {PROMPT_TYPE_LABELS[promptType]} Prompt
            </h2>
            <p className="text-sm text-gray-500">
              {PROMPT_TYPE_DESCRIPTIONS[promptType]}
            </p>
          </div>
          {config.hasOrgOverride && (
            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
              Org Override
            </span>
          )}
        </div>
      </div>

      {/* Not Editable Warning */}
      {!canEdit && (
        <div className="mb-4 rounded bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          ⚠️ AI configuration is managed at the system level. Contact your
          platform administrator to enable org-level prompt customization.
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* AI Provider & Model */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="prompt-provider"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              AI Provider
            </label>
            <select
              id="prompt-provider"
              value={aiProviderId}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={!canEdit || isSaving}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Default</option>
              {aiProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="prompt-model"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              AI Model
            </label>
            <select
              id="prompt-model"
              value={aiModelId}
              onChange={(e) => setAiModelId(e.target.value)}
              disabled={!canEdit || isSaving || !aiProviderId}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Default</option>
              {aiModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Temperature & Max Tokens */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="prompt-temperature"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Temperature
            </label>
            <input
              id="prompt-temperature"
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              disabled={!canEdit || isSaving}
              min="0"
              max="2"
              step="0.1"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">0 = deterministic, 1 = creative</p>
          </div>
          <div>
            <label
              htmlFor="prompt-max-tokens"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Max Tokens
            </label>
            <input
              id="prompt-max-tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              disabled={!canEdit || isSaving}
              min="1"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">Max response length</p>
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label
            htmlFor="prompt-system"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            System Prompt
          </label>
          <textarea
            id="prompt-system"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            disabled={!canEdit || isSaving}
            rows={4}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="You are an expert document evaluator..."
          />
        </div>

        {/* User Prompt Template */}
        <div>
          <label
            htmlFor="prompt-user"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            User Prompt Template
          </label>
          <textarea
            id="prompt-user"
            value={userPromptTemplate}
            onChange={(e) => setUserPromptTemplate(e.target.value)}
            disabled={!canEdit || isSaving}
            rows={6}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="Evaluate the following document against the criteria..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Use {`{{variable_name}}`} for template placeholders
          </p>
        </div>

        {/* Preview */}
        <PromptPreview
          systemPrompt={systemPrompt}
          userPromptTemplate={userPromptTemplate}
          isExpanded={showPreview}
          onToggle={() => setShowPreview(!showPreview)}
        />

        {/* Test Panel */}
        {onTest && (
          <div className="rounded-lg border">
            <button
              onClick={() => setShowTestPanel(!showTestPanel)}
              className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-700">
                🧪 Test Prompt
              </span>
              <span className="text-sm">{showTestPanel ? "▼" : "▶"}</span>
            </button>
            {showTestPanel && (
              <div className="border-t px-4 py-3 space-y-4">
                <TestVariablesForm
                  variables={testVariables}
                  onChange={setTestVariables}
                  disabled={isTesting}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTest}
                    disabled={isTesting || !canEdit}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isTesting ? "Testing..." : "Run Test"}
                  </button>
                </div>
                {testResult && (
                  <div className="rounded border bg-gray-50 p-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Test Result
                    </h3>
                    <p className="text-sm text-green-700">{testResult.message}</p>
                    {testResult.renderedSystemPrompt && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Rendered System:</p>
                        <pre className="text-xs bg-white rounded border p-2 mt-1 overflow-x-auto">
                          {testResult.renderedSystemPrompt}
                        </pre>
                      </div>
                    )}
                    {testResult.renderedUserPrompt && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Rendered User:</p>
                        <pre className="text-xs bg-white rounded border p-2 mt-1 overflow-x-auto">
                          {testResult.renderedUserPrompt}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* System Default Reference (for org level) */}
        {sysConfig && (
          <div className="rounded bg-gray-50 p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              System Default
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                <strong>Temperature:</strong> {sysConfig.temperature}
              </p>
              <p>
                <strong>Max Tokens:</strong> {sysConfig.maxTokens}
              </p>
            </div>
            {onResetToDefault && canEdit && (
              <button
                onClick={onResetToDefault}
                disabled={isSaving}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Reset to system default
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {displayError && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">
            {displayError}
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PromptConfigEditor;
