/**
 * ResultEditDialog - Result Editing Dialog Component
 *
 * Modal dialog for editing evaluation criteria results.
 * Allows editing narrative and status with notes.
 */

"use client";

import React, { useState, useEffect } from "react";
import type {
  CriteriaResultWithItem,
  StatusOption,
  EditResultInput,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface ResultEditDialogProps {
  /** Result being edited */
  result: CriteriaResultWithItem | null;
  /** Available status options */
  statusOptions: StatusOption[];
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when save is requested */
  onSave: (resultId: string, input: EditResultInput) => Promise<void>;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ResultEditDialog({
  result,
  statusOptions,
  isOpen,
  isSaving = false,
  onClose,
  onSave,
  className = "",
}: ResultEditDialogProps) {
  // Form state
  const [editedResult, setEditedResult] = useState("");
  const [editedStatusId, setEditedStatusId] = useState<string | undefined>();
  const [editNotes, setEditNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize form when result changes
  useEffect(() => {
    if (result) {
      // Use current edit values if available, otherwise AI values
      setEditedResult(
        result.currentEdit?.editedResult ?? result.aiResult?.result ?? ""
      );
      setEditedStatusId(
        result.currentEdit?.editedStatusId ?? result.aiResult?.statusId
      );
      setEditNotes("");
      setError(null);
    }
  }, [result]);

  // Handle save
  const handleSave = async () => {
    if (!result?.aiResult?.id) {
      setError("No result ID available");
      return;
    }

    try {
      setError(null);
      await onSave(result.aiResult.id, {
        editedResult: editedResult || undefined,
        editedStatusId: editedStatusId || undefined,
        editNotes: editNotes || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edit");
    }
  };

  // Handle close with escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !result) return null;

  const hasChanges =
    editedResult !== (result.currentEdit?.editedResult ?? result.aiResult?.result ?? "") ||
    editedStatusId !== (result.currentEdit?.editedStatusId ?? result.aiResult?.statusId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
    >
      <div
        className={`
          max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl
          ${className}
        `}
      >
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="edit-dialog-title" className="text-lg font-semibold text-gray-900">
                Edit Result
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {result.criteriaItem.criteriaId} - {result.criteriaItem.requirement}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Close dialog"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Original AI Result (read-only) */}
          {result.aiResult?.result && (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Original AI Response
                </span>
                {result.aiResult.confidence !== undefined && (
                  <span className="text-xs text-gray-500">
                    Confidence: {result.aiResult.confidence}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {result.aiResult.result}
              </p>
            </div>
          )}

          {/* Edited Result */}
          <div>
            <label
              htmlFor="edited-result"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Edited Response
            </label>
            <textarea
              id="edited-result"
              value={editedResult}
              onChange={(e) => setEditedResult(e.target.value)}
              disabled={isSaving}
              rows={6}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="Enter your edited response..."
            />
          </div>

          {/* Status Selection */}
          <div>
            <label
              htmlFor="edited-status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="edited-status"
              value={editedStatusId || ""}
              onChange={(e) => setEditedStatusId(e.target.value || undefined)}
              disabled={isSaving}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select status...</option>
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* Edit Notes */}
          <div>
            <label
              htmlFor="edit-notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Edit Notes <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="edit-notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              disabled={isSaving}
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="Why are you making this edit?"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Previous Edit Info */}
          {result.hasEdit && result.currentEdit && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              <span className="font-medium">Previous edit:</span> by{" "}
              {result.currentEdit.editorName || "Unknown"} on{" "}
              {new Date(result.currentEdit.createdAt).toLocaleDateString()}
              {result.currentEdit.editNotes && (
                <span className="block mt-1 italic">
                  Note: {result.currentEdit.editNotes}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CONFIRM DIALOG COMPONENT
// =============================================================================

export interface ConfirmDialogProps {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether action is in progress */
  isLoading?: boolean;
  /** Whether action is destructive */
  destructive?: boolean;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

/**
 * Generic confirmation dialog
 */
export function ConfirmDialog({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isOpen,
  isLoading = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50
              ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {isLoading ? "Loading..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultEditDialog;
