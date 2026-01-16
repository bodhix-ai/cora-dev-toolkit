/**
 * ScoringConfigPanel - Scoring Configuration Panel Component
 *
 * Admin component for configuring evaluation scoring settings.
 * Supports system-level defaults and org-level overrides.
 */

"use client";

import React, { useState } from "react";
import type {
  EvalSysConfig,
  EvalOrgConfig,
  UpdateSysConfigInput,
  UpdateOrgConfigInput,
  CategoricalMode,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface ScoringConfigPanelProps {
  /** Current configuration (sys or org merged with sys) */
  config: {
    categoricalMode: CategoricalMode;
    showNumericalScore: boolean;
    isOrgOverride?: {
      categoricalMode: boolean;
      showNumericalScore: boolean;
    };
  };
  /** System config (for reference in org view) */
  sysConfig?: EvalSysConfig;
  /** Whether editing system-level config */
  isSystemLevel?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when saving config */
  onSave: (input: UpdateSysConfigInput | UpdateOrgConfigInput) => Promise<void>;
  /** Callback when resetting to system defaults (org level only) */
  onResetField?: (field: "categoricalMode" | "showNumericalScore") => Promise<void>;
  /** Custom class name */
  className?: string;
}

export interface ScoringModeCardProps {
  /** Mode value */
  mode: CategoricalMode;
  /** Whether selected */
  isSelected: boolean;
  /** Whether disabled */
  disabled?: boolean;
  /** Whether this is an org override */
  isOverride?: boolean;
  /** Callback when selected */
  onSelect: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MODE_INFO: Record<CategoricalMode, { title: string; description: string; examples: string[] }> = {
  boolean: {
    title: "Boolean Mode",
    description: "Simple pass/fail evaluation with two status options",
    examples: ["Compliant / Non-Compliant", "Pass / Fail", "Yes / No"],
  },
  detailed: {
    title: "Detailed Mode",
    description: "Multiple status levels for nuanced evaluation",
    examples: [
      "Fully Compliant / Partially Compliant / Non-Compliant",
      "Excellent / Good / Needs Improvement / Poor",
      "Met / Partially Met / Not Met / Not Applicable",
    ],
  },
};

// =============================================================================
// SCORING MODE CARD
// =============================================================================

export function ScoringModeCard({
  mode,
  isSelected,
  disabled = false,
  isOverride = false,
  onSelect,
}: ScoringModeCardProps) {
  const info = MODE_INFO[mode];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full text-left rounded-lg border-2 p-4 transition-all
        ${isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{info.title}</h3>
            {isSelected && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                Active
              </span>
            )}
            {isOverride && isSelected && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                Override
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">{info.description}</p>
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Examples:</p>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {info.examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3
            ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"}
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// SCORING CONFIG PANEL
// =============================================================================

export function ScoringConfigPanel({
  config,
  sysConfig,
  isSystemLevel = false,
  isSaving = false,
  error,
  onSave,
  onResetField,
  className = "",
}: ScoringConfigPanelProps) {
  const [categoricalMode, setCategoricalMode] = useState<CategoricalMode>(
    config.categoricalMode
  );
  const [showNumericalScore, setShowNumericalScore] = useState(
    config.showNumericalScore
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleModeChange = (mode: CategoricalMode) => {
    setCategoricalMode(mode);
    setHasChanges(true);
  };

  const handleNumericalChange = (show: boolean) => {
    setShowNumericalScore(show);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setLocalError(null);
      if (isSystemLevel) {
        await onSave({
          categoricalMode,
          showNumericalScore,
        });
      } else {
        // For org level, only send if different from current
        const input: UpdateOrgConfigInput = {};
        if (categoricalMode !== config.categoricalMode) {
          input.categoricalMode = categoricalMode;
        }
        if (showNumericalScore !== config.showNumericalScore) {
          input.showNumericalScore = showNumericalScore;
        }
        await onSave(input);
      }
      setHasChanges(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleResetMode = async () => {
    if (!onResetField || !sysConfig) return;
    try {
      await onResetField("categoricalMode");
      setCategoricalMode(sysConfig.categoricalMode);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const handleResetNumerical = async () => {
    if (!onResetField || !sysConfig) return;
    try {
      await onResetField("showNumericalScore");
      setShowNumericalScore(sysConfig.showNumericalScore);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const displayError = error || localError;

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Scoring Configuration</h2>
        <p className="text-sm text-gray-500">
          {isSystemLevel
            ? "Configure default scoring settings for all organizations"
            : "Configure scoring settings for your organization"}
        </p>
      </div>

      {/* Categorical Mode */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-gray-900">Evaluation Mode</h3>
            <p className="text-sm text-gray-500">
              How criteria results are categorized
            </p>
          </div>
          {!isSystemLevel && config.isOrgOverride?.categoricalMode && onResetField && (
            <button
              onClick={handleResetMode}
              disabled={isSaving}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Reset to default
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoringModeCard
            mode="boolean"
            isSelected={categoricalMode === "boolean"}
            disabled={isSaving}
            isOverride={!isSystemLevel && config.isOrgOverride?.categoricalMode}
            onSelect={() => handleModeChange("boolean")}
          />
          <ScoringModeCard
            mode="detailed"
            isSelected={categoricalMode === "detailed"}
            disabled={isSaving}
            isOverride={!isSystemLevel && config.isOrgOverride?.categoricalMode}
            onSelect={() => handleModeChange("detailed")}
          />
        </div>
      </div>

      {/* Numerical Score Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-gray-900">Numerical Compliance Score</h3>
            <p className="text-sm text-gray-500">
              Display a percentage-based compliance score
            </p>
          </div>
          {!isSystemLevel && config.isOrgOverride?.showNumericalScore && onResetField && (
            <button
              onClick={handleResetNumerical}
              disabled={isSaving}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Reset to default
            </button>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-medium text-gray-900">
                Show numerical score
              </span>
              {!isSystemLevel && config.isOrgOverride?.showNumericalScore && (
                <span className="ml-2 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                  Override
                </span>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Display compliance as a percentage (e.g., 84% compliant)
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={showNumericalScore}
                onChange={(e) => handleNumericalChange(e.target.checked)}
                disabled={isSaving}
                className="sr-only"
              />
              <div
                className={`
                  w-11 h-6 rounded-full transition-colors
                  ${showNumericalScore ? "bg-blue-600" : "bg-gray-200"}
                  ${isSaving ? "opacity-50" : ""}
                `}
              />
              <div
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow
                  ${showNumericalScore ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </div>
          </label>
        </div>
      </div>

      {/* System Default Reference (for org level) */}
      {!isSystemLevel && sysConfig && (
        <div className="mb-6 rounded bg-gray-50 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            System Defaults
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Mode:</strong>{" "}
              {sysConfig.categoricalMode === "boolean" ? "Boolean" : "Detailed"}
            </p>
            <p>
              <strong>Numerical Score:</strong>{" "}
              {sysConfig.showNumericalScore ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {displayError && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {displayError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default ScoringConfigPanel;
