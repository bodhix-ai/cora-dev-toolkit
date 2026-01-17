/**
 * DocTypeManager - Document Type Management Component
 *
 * Admin component for CRUD operations on document types.
 * Includes create, edit, and delete functionality.
 */

"use client";

import React, { useState } from "react";
import type {
  EvalDocType,
  CreateDocTypeInput,
  UpdateDocTypeInput,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface DocTypeManagerProps {
  /** List of document types */
  docTypes: EvalDocType[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when creating a doc type */
  onCreate: (input: CreateDocTypeInput) => Promise<void>;
  /** Callback when updating a doc type */
  onUpdate: (id: string, input: UpdateDocTypeInput) => Promise<void>;
  /** Callback when deleting a doc type */
  onDelete: (id: string) => Promise<void>;
  /** Callback to refresh the list */
  onRefresh?: () => void;
  /** Custom class name */
  className?: string;
}

export interface DocTypeFormProps {
  /** Existing doc type (for editing) */
  docType?: EvalDocType;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Callback when form is submitted */
  onSubmit: (input: CreateDocTypeInput | UpdateDocTypeInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

export interface DocTypeCardProps {
  /** Document type */
  docType: EvalDocType;
  /** Callback when edit is clicked */
  onEdit: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// DOC TYPE FORM
// =============================================================================

export function DocTypeForm({
  docType,
  isSaving = false,
  onSubmit,
  onCancel,
}: DocTypeFormProps) {
  const [name, setName] = useState(docType?.name || "");
  const [description, setDescription] = useState(docType?.description || "");
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!docType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setError(null);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="doctype-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="doctype-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="e.g., IT Security Policy"
        />
      </div>

      <div>
        <label
          htmlFor="doctype-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="doctype-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSaving}
          rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Brief description of this document type..."
        />
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
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
// DOC TYPE CARD
// =============================================================================

export function DocTypeCard({
  docType,
  onEdit,
  onDelete,
  className = "",
}: DocTypeCardProps) {
  return (
    <div
      className={`
        rounded-lg border p-4 transition-shadow hover:shadow-sm
        ${!docType.isActive ? "opacity-60 bg-gray-50" : "bg-white"}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{docType.name}</h3>
            {!docType.isActive && (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                Inactive
              </span>
            )}
          </div>
          {docType.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {docType.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>
              {docType.criteriaSetsCount ?? 0} criteria set
              {docType.criteriaSetsCount !== 1 ? "s" : ""}
            </span>
            <span>
              Created {new Date(docType.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-2">
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
    </div>
  );
}

// =============================================================================
// DOC TYPE MANAGER
// =============================================================================

export function DocTypeManager({
  docTypes,
  isLoading = false,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  className = "",
}: DocTypeManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editingDocType = editingId
    ? docTypes.find((dt) => dt.id === editingId)
    : null;

  const handleCreate = async (input: CreateDocTypeInput) => {
    try {
      setIsSaving(true);
      await onCreate(input);
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (input: UpdateDocTypeInput) => {
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
          <h2 className="text-lg font-semibold text-gray-900">Document Types</h2>
          <p className="text-sm text-gray-500">
            Categorize documents for evaluation
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
            + New Doc Type
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
          <h3 className="mb-3 font-medium text-gray-900">New Document Type</h3>
          <DocTypeForm
            isSaving={isSaving}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingDocType && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Edit Document Type</h3>
          <DocTypeForm
            docType={editingDocType}
            isSaving={isSaving}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && docTypes.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          Loading document types...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && docTypes.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No document types yet. Create one to get started.
        </div>
      )}

      {/* Doc Type List */}
      {docTypes.length > 0 && (
        <div className="space-y-3">
          {docTypes.map((docType) => (
            <DocTypeCard
              key={docType.id}
              docType={docType}
              onEdit={() => setEditingId(docType.id)}
              onDelete={() => setDeletingId(docType.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setDeletingId(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Document Type?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will also affect any evaluations using this document type.
              This action cannot be undone.
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

export default DocTypeManager;
