/**
 * CriteriaSetManager - Criteria Set Management Component
 *
 * Admin component for CRUD operations on criteria sets.
 * Includes create, edit, delete, and import functionality.
 */

"use client";

import React, { useState } from "react";
import type {
  EvalCriteriaSet,
  EvalDocType,
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface CriteriaSetManagerProps {
  /** List of criteria sets */
  criteriaSets: EvalCriteriaSet[];
  /** Available document types for filtering/selection */
  docTypes: EvalDocType[];
  /** Currently selected doc type filter */
  selectedDocTypeId?: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when creating a criteria set */
  onCreate: (input: CreateCriteriaSetInput) => Promise<void>;
  /** Callback when updating a criteria set */
  onUpdate: (id: string, input: UpdateCriteriaSetInput) => Promise<void>;
  /** Callback when deleting a criteria set */
  onDelete: (id: string) => Promise<void>;
  /** Callback when clicking to view items */
  onViewItems?: (criteriaSet: EvalCriteriaSet) => void;
  /** Callback when clicking to import */
  onImport?: () => void;
  /** Callback when filter changes */
  onFilterChange?: (docTypeId: string | undefined) => void;
  /** Callback to refresh the list */
  onRefresh?: () => void;
  /** Custom class name */
  className?: string;
}

export interface CriteriaSetFormProps {
  /** Existing criteria set (for editing) */
  criteriaSet?: EvalCriteriaSet;
  /** Available document types */
  docTypes: EvalDocType[];
  /** Pre-selected doc type ID */
  defaultDocTypeId?: string;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Callback when form is submitted */
  onSubmit: (input: CreateCriteriaSetInput | UpdateCriteriaSetInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

export interface CriteriaSetCardProps {
  /** Criteria set */
  criteriaSet: EvalCriteriaSet;
  /** Callback when edit is clicked */
  onEdit: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Callback when view items is clicked */
  onViewItems?: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// CRITERIA SET FORM
// =============================================================================

export function CriteriaSetForm({
  criteriaSet,
  docTypes,
  defaultDocTypeId,
  isSaving = false,
  onSubmit,
  onCancel,
}: CriteriaSetFormProps) {
  const [name, setName] = useState(criteriaSet?.name || "");
  const [description, setDescription] = useState(criteriaSet?.description || "");
  const [version, setVersion] = useState(criteriaSet?.version || "1.0");
  const [docTypeId, setDocTypeId] = useState(
    criteriaSet?.docTypeId || defaultDocTypeId || ""
  );
  const [useWeightedScoring, setUseWeightedScoring] = useState(
    criteriaSet?.useWeightedScoring ?? false
  );
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!criteriaSet;
  const activeDocTypes = docTypes.filter((dt) => dt.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!isEdit && !docTypeId) {
      setError("Document type is required");
      return;
    }

    try {
      setError(null);
      if (isEdit) {
        await onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          version: version.trim() || undefined,
          useWeightedScoring,
        });
      } else {
        await onSubmit({
          docTypeId,
          name: name.trim(),
          description: description.trim() || undefined,
          version: version.trim() || undefined,
          useWeightedScoring,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <div>
          <label
            htmlFor="criteriaset-doctype"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Document Type <span className="text-red-500">*</span>
          </label>
          <select
            id="criteriaset-doctype"
            value={docTypeId}
            onChange={(e) => setDocTypeId(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select a document type...</option>
            {activeDocTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="criteriaset-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="criteriaset-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="e.g., NIST 800-53 Controls"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="criteriaset-version"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Version
          </label>
          <input
            id="criteriaset-version"
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="e.g., 1.0"
          />
        </div>
        <div className="flex items-center pt-6">
          <input
            id="criteriaset-weighted"
            type="checkbox"
            checked={useWeightedScoring}
            onChange={(e) => setUseWeightedScoring(e.target.checked)}
            disabled={isSaving}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="criteriaset-weighted"
            className="ml-2 text-sm text-gray-700"
          >
            Use weighted scoring
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="criteriaset-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="criteriaset-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSaving}
          rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Brief description of this criteria set..."
        />
      </div>

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
// CRITERIA SET CARD
// =============================================================================

export function CriteriaSetCard({
  criteriaSet,
  onEdit,
  onDelete,
  onViewItems,
  className = "",
}: CriteriaSetCardProps) {
  return (
    <div
      className={`
        rounded-lg border p-4 transition-shadow hover:shadow-sm
        ${!criteriaSet.isActive ? "opacity-60 bg-gray-50" : "bg-white"}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-900">{criteriaSet.name}</h3>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              v{criteriaSet.version}
            </span>
            {criteriaSet.useWeightedScoring && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                Weighted
              </span>
            )}
            {!criteriaSet.isActive && (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                Inactive
              </span>
            )}
          </div>
          {criteriaSet.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {criteriaSet.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>
              {criteriaSet.itemCount ?? 0} criteria item
              {criteriaSet.itemCount !== 1 ? "s" : ""}
            </span>
            {criteriaSet.sourceFileName && (
              <span title="Imported from file">
                📄 {criteriaSet.sourceFileName}
              </span>
            )}
            <span>
              Created {new Date(criteriaSet.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-1">
          {onViewItems && (
            <button
              onClick={onViewItems}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="View Criteria Items"
            >
              📋
            </button>
          )}
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CRITERIA SET MANAGER
// =============================================================================

export function CriteriaSetManager({
  criteriaSets,
  docTypes,
  selectedDocTypeId,
  isLoading = false,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onViewItems,
  onImport,
  onFilterChange,
  onRefresh,
  className = "",
}: CriteriaSetManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editingCriteriaSet = editingId
    ? criteriaSets.find((cs) => cs.id === editingId)
    : null;

  const filteredCriteriaSets = selectedDocTypeId
    ? criteriaSets.filter((cs) => cs.docTypeId === selectedDocTypeId)
    : criteriaSets;

  const handleCreate = async (input: CreateCriteriaSetInput) => {
    try {
      setIsSaving(true);
      await onCreate(input);
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (input: UpdateCriteriaSetInput) => {
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

  const deletingCriteriaSet = deletingId
    ? criteriaSets.find((cs) => cs.id === deletingId)
    : null;

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Criteria Sets</h2>
          <p className="text-sm text-gray-500">
            Manage evaluation criteria for document types
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
          {onImport && (
            <button
              onClick={onImport}
              disabled={isLoading || isCreating}
              className="rounded border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              📥 Import
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            disabled={isLoading || isCreating}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + New Criteria Set
          </button>
        </div>
      </div>

      {/* Filter */}
      {onFilterChange && docTypes.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedDocTypeId || ""}
            onChange={(e) => onFilterChange(e.target.value || undefined)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Document Types</option>
            {docTypes
              .filter((dt) => dt.isActive)
              .map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">New Criteria Set</h3>
          <CriteriaSetForm
            docTypes={docTypes}
            defaultDocTypeId={selectedDocTypeId}
            isSaving={isSaving}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingCriteriaSet && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Edit Criteria Set</h3>
          <CriteriaSetForm
            criteriaSet={editingCriteriaSet}
            docTypes={docTypes}
            isSaving={isSaving}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && criteriaSets.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          Loading criteria sets...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCriteriaSets.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          {selectedDocTypeId
            ? "No criteria sets for this document type. Create one or import from spreadsheet."
            : "No criteria sets yet. Create one to get started."}
        </div>
      )}

      {/* Criteria Set List */}
      {filteredCriteriaSets.length > 0 && (
        <div className="space-y-3">
          {filteredCriteriaSets.map((criteriaSet) => (
            <CriteriaSetCard
              key={criteriaSet.id}
              criteriaSet={criteriaSet}
              onEdit={() => setEditingId(criteriaSet.id)}
              onDelete={() => setDeletingId(criteriaSet.id)}
              onViewItems={onViewItems ? () => onViewItems(criteriaSet) : undefined}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && deletingCriteriaSet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setDeletingId(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Criteria Set?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will delete <strong>{deletingCriteriaSet.name}</strong> and
              all its {deletingCriteriaSet.itemCount ?? 0} criteria items. This
              action cannot be undone.
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

export default CriteriaSetManager;
