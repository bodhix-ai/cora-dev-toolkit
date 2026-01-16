/**
 * StatusOptionManager - Status Option Management Component
 *
 * Admin component for CRUD operations on status options.
 * Supports both system-level and org-level status options.
 */

"use client";

import React, { useState } from "react";
import type {
  EvalSysStatusOption,
  EvalOrgStatusOption,
  StatusOptionInput,
  StatusOptionMode,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface StatusOptionManagerProps {
  /** List of status options (either sys or org) */
  statusOptions: (EvalSysStatusOption | EvalOrgStatusOption)[];
  /** Whether managing system-level options */
  isSystemLevel?: boolean;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when creating a status option */
  onCreate: (input: StatusOptionInput) => Promise<void>;
  /** Callback when updating a status option */
  onUpdate: (id: string, input: StatusOptionInput) => Promise<void>;
  /** Callback when deleting a status option */
  onDelete: (id: string) => Promise<void>;
  /** Callback to refresh the list */
  onRefresh?: () => void;
  /** Custom class name */
  className?: string;
}

export interface StatusOptionFormProps {
  /** Existing option (for editing) */
  statusOption?: EvalSysStatusOption | EvalOrgStatusOption;
  /** Whether managing system-level options */
  isSystemLevel?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Callback when form is submitted */
  onSubmit: (input: StatusOptionInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

export interface StatusOptionCardProps {
  /** Status option */
  statusOption: EvalSysStatusOption | EvalOrgStatusOption;
  /** Callback when edit is clicked */
  onEdit: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Custom class name */
  className?: string;
}

export interface ColorPickerProps {
  /** Current color value */
  value: string;
  /** Callback when color changes */
  onChange: (color: string) => void;
  /** Whether disabled */
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PRESET_COLORS = [
  "#22c55e", // green
  "#ef4444", // red
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
  "#14b8a6", // teal
];

const MODE_OPTIONS: { value: StatusOptionMode; label: string }[] = [
  { value: "boolean", label: "Boolean Mode" },
  { value: "detailed", label: "Detailed Mode" },
  { value: "both", label: "Both Modes" },
];

// =============================================================================
// COLOR PICKER
// =============================================================================

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" role="group" aria-label="Preset colors">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            disabled={disabled}
            className={`
              w-6 h-6 rounded border-2 transition-all
              ${value === color ? "border-gray-900 scale-110" : "border-transparent"}
              ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
            `}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
            aria-pressed={value === color}
          />
        ))}
      </div>
      <label htmlFor="custom-color-picker" className="sr-only">
        Custom color
      </label>
      <input
        id="custom-color-picker"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-8 h-8 rounded cursor-pointer border border-gray-300"
        aria-label="Custom color picker"
      />
    </div>
  );
}

// =============================================================================
// STATUS OPTION FORM
// =============================================================================

export function StatusOptionForm({
  statusOption,
  isSystemLevel = false,
  isSaving = false,
  onSubmit,
  onCancel,
}: StatusOptionFormProps) {
  const [name, setName] = useState(statusOption?.name || "");
  const [color, setColor] = useState(statusOption?.color || "#22c55e");
  const [scoreValue, setScoreValue] = useState(
    statusOption?.scoreValue?.toString() || ""
  );
  const [orderIndex, setOrderIndex] = useState(
    statusOption?.orderIndex?.toString() || "0"
  );
  const [mode, setMode] = useState<StatusOptionMode>(
    (statusOption as EvalSysStatusOption)?.mode || "both"
  );
  const [isActive, setIsActive] = useState(
    (statusOption as EvalOrgStatusOption)?.isActive ?? true
  );
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!statusOption;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const scoreNum = scoreValue ? parseFloat(scoreValue) : undefined;
    if (scoreValue && isNaN(scoreNum!)) {
      setError("Score value must be a number");
      return;
    }

    const orderNum = parseInt(orderIndex);
    if (isNaN(orderNum)) {
      setError("Order must be a number");
      return;
    }

    try {
      setError(null);
      const input: StatusOptionInput = {
        name: name.trim(),
        color,
        scoreValue: scoreNum,
        orderIndex: orderNum,
      };

      if (isSystemLevel) {
        input.mode = mode;
      } else {
        input.isActive = isActive;
      }

      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="status-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="status-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="e.g., Compliant, Non-Compliant"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <ColorPicker value={color} onChange={setColor} disabled={isSaving} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="status-score"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Score Value
          </label>
          <input
            id="status-score"
            type="number"
            value={scoreValue}
            onChange={(e) => setScoreValue(e.target.value)}
            disabled={isSaving}
            step="0.1"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="e.g., 1.0"
          />
          <p className="mt-1 text-xs text-gray-500">
            Used for compliance scoring
          </p>
        </div>
        <div>
          <label
            htmlFor="status-order"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Display Order
          </label>
          <input
            id="status-order"
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {isSystemLevel && (
        <div>
          <label
            htmlFor="status-mode"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Applies To
          </label>
          <select
            id="status-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as StatusOptionMode)}
            disabled={isSaving}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isSystemLevel && (
        <div className="flex items-center gap-2">
          <input
            id="status-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSaving}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="status-active" className="text-sm text-gray-700">
            Active
          </label>
        </div>
      )}

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// STATUS OPTION CARD
// =============================================================================

export function StatusOptionCard({
  statusOption,
  onEdit,
  onDelete,
  className = "",
}: StatusOptionCardProps) {
  const isOrgOption = "isActive" in statusOption;
  const isSysOption = "mode" in statusOption;

  return (
    <div
      className={`
        flex items-center justify-between rounded-lg border p-3 bg-white
        ${isOrgOption && !statusOption.isActive ? "opacity-60" : ""}
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Color Badge */}
        <div
          className="w-4 h-4 rounded-full border border-gray-200"
          style={{ backgroundColor: statusOption.color }}
          title={statusOption.color}
        />

        {/* Name */}
        <span className="font-medium text-gray-900">{statusOption.name}</span>

        {/* Badges */}
        <div className="flex items-center gap-2">
          {isSysOption && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {(statusOption as EvalSysStatusOption).mode === "both"
                ? "All Modes"
                : (statusOption as EvalSysStatusOption).mode === "boolean"
                ? "Boolean"
                : "Detailed"}
            </span>
          )}
          {statusOption.scoreValue !== undefined && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              Score: {statusOption.scoreValue}
            </span>
          )}
          {isOrgOption && !statusOption.isActive && (
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 mr-2">
          #{statusOption.orderIndex}
        </span>
        <button
          onClick={onEdit}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// STATUS OPTION MANAGER
// =============================================================================

export function StatusOptionManager({
  statusOptions,
  isSystemLevel = false,
  isLoading = false,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  className = "",
}: StatusOptionManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editingOption = editingId
    ? statusOptions.find((o) => o.id === editingId)
    : null;

  const deletingOption = deletingId
    ? statusOptions.find((o) => o.id === deletingId)
    : null;

  // Sort by order index
  const sortedOptions = [...statusOptions].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const handleCreate = async (input: StatusOptionInput) => {
    try {
      setIsSaving(true);
      await onCreate(input);
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (input: StatusOptionInput) => {
    if (!editingId) return;
    try {
      setIsSaving(true);
      await onUpdate(editingId, input);
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setIsSaving(true);
      await onDelete(deletingId);
      setDeletingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isSystemLevel ? "System Status Options" : "Organization Status Options"}
          </h2>
          <p className="text-sm text-gray-500">
            {isSystemLevel
              ? "Default status options for all organizations"
              : "Status options for your organization"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Refresh
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            disabled={isLoading || isCreating}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + Add Option
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">New Status Option</h3>
          <StatusOptionForm
            isSystemLevel={isSystemLevel}
            isSaving={isSaving}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingOption && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Edit Status Option</h3>
          <StatusOptionForm
            statusOption={editingOption}
            isSystemLevel={isSystemLevel}
            isSaving={isSaving}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && statusOptions.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          Loading status options...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && statusOptions.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No status options yet. Create one to get started.
        </div>
      )}

      {/* Status Option List */}
      {sortedOptions.length > 0 && (
        <div className="space-y-2">
          {sortedOptions.map((option) => (
            <StatusOptionCard
              key={option.id}
              statusOption={option}
              onEdit={() => setEditingId(option.id)}
              onDelete={() => setDeletingId(option.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && deletingOption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setDeletingId(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Status Option?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will delete <strong>{deletingOption.name}</strong>. Existing
              evaluations using this status will not be affected.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isSaving}
                className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusOptionManager;
