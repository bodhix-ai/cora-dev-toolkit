/**
 * CriteriaItemEditor - Criteria Item Editor Component
 *
 * Admin component for viewing and editing individual criteria items.
 * Supports inline editing, reordering, and bulk operations.
 */

"use client";

import React, { useState } from "react";
import type {
  EvalCriteriaItem,
  EvalCriteriaSet,
  CreateCriteriaItemInput,
  UpdateCriteriaItemInput,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface CriteriaItemEditorProps {
  /** Parent criteria set */
  criteriaSet: EvalCriteriaSet;
  /** List of criteria items */
  items: EvalCriteriaItem[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when adding an item */
  onAdd: (input: CreateCriteriaItemInput) => Promise<void>;
  /** Callback when updating an item */
  onUpdate: (id: string, input: UpdateCriteriaItemInput) => Promise<void>;
  /** Callback when deleting an item */
  onDelete: (id: string) => Promise<void>;
  /** Callback when going back */
  onBack?: () => void;
  /** Callback to refresh the list */
  onRefresh?: () => void;
  /** Custom class name */
  className?: string;
}

export interface CriteriaItemFormProps {
  /** Existing item (for editing) */
  item?: EvalCriteriaItem;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether criteria set uses weighted scoring */
  useWeightedScoring?: boolean;
  /** Callback when form is submitted */
  onSubmit: (input: CreateCriteriaItemInput | UpdateCriteriaItemInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

export interface CriteriaItemRowProps {
  /** Criteria item */
  item: EvalCriteriaItem;
  /** Whether criteria set uses weighted scoring */
  useWeightedScoring?: boolean;
  /** Callback when edit is clicked */
  onEdit: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Custom class name */
  className?: string;
}

export interface CategoryGroupProps {
  /** Category name */
  category: string | null;
  /** Items in this category */
  items: EvalCriteriaItem[];
  /** Whether criteria set uses weighted scoring */
  useWeightedScoring?: boolean;
  /** Callback when edit is clicked */
  onEdit: (item: EvalCriteriaItem) => void;
  /** Callback when delete is clicked */
  onDelete: (item: EvalCriteriaItem) => void;
  /** Whether group is expanded */
  isExpanded?: boolean;
  /** Callback to toggle expansion */
  onToggle?: () => void;
}

// =============================================================================
// CRITERIA ITEM FORM
// =============================================================================

export function CriteriaItemForm({
  item,
  isSaving = false,
  useWeightedScoring = false,
  onSubmit,
  onCancel,
}: CriteriaItemFormProps) {
  const [criteriaId, setCriteriaId] = useState(item?.criteriaId || "");
  const [requirement, setRequirement] = useState(item?.requirement || "");
  const [description, setDescription] = useState(item?.description || "");
  const [category, setCategory] = useState(item?.category || "");
  const [weight, setWeight] = useState(item?.weight?.toString() || "1");
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!item;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!criteriaId.trim()) {
      setError("Criteria ID is required");
      return;
    }

    if (!requirement.trim()) {
      setError("Requirement is required");
      return;
    }

    const weightNum = parseFloat(weight);
    if (useWeightedScoring && (isNaN(weightNum) || weightNum <= 0)) {
      setError("Weight must be a positive number");
      return;
    }

    try {
      setError(null);
      await onSubmit({
        criteriaId: criteriaId.trim(),
        requirement: requirement.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        weight: weightNum || 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="item-criteria-id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Criteria ID <span className="text-red-500">*</span>
          </label>
          <input
            id="item-criteria-id"
            type="text"
            value={criteriaId}
            onChange={(e) => setCriteriaId(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="e.g., AC-1, SI-3"
          />
        </div>
        <div>
          <label
            htmlFor="item-category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <input
            id="item-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSaving}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="e.g., Access Control"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="item-requirement"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Requirement <span className="text-red-500">*</span>
        </label>
        <textarea
          id="item-requirement"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          disabled={isSaving}
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="The requirement text..."
        />
      </div>

      <div>
        <label
          htmlFor="item-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSaving}
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Additional details about the requirement..."
        />
      </div>

      {useWeightedScoring && (
        <div className="w-32">
          <label
            htmlFor="item-weight"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Weight
          </label>
          <input
            id="item-weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            disabled={isSaving}
            min="0.1"
            step="0.1"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
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
          {isSaving ? "Saving..." : isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// CRITERIA ITEM ROW
// =============================================================================

export function CriteriaItemRow({
  item,
  useWeightedScoring = false,
  onEdit,
  onDelete,
  className = "",
}: CriteriaItemRowProps) {
  return (
    <div
      className={`
        flex items-start gap-4 rounded border p-3 bg-white hover:bg-gray-50
        ${!item.isActive ? "opacity-60" : ""}
        ${className}
      `}
    >
      {/* Criteria ID */}
      <div className="w-20 flex-shrink-0">
        <span className="font-mono text-sm font-medium text-blue-600">
          {item.criteriaId}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{item.requirement}</p>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Category & Weight */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {item.category && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {item.category}
          </span>
        )}
        {useWeightedScoring && (
          <span className="text-xs text-gray-500" title="Weight">
            ⚖️ {item.weight}
          </span>
        )}
        {!item.isActive && (
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
            Inactive
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
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
// CATEGORY GROUP
// =============================================================================

export function CategoryGroup({
  category,
  items,
  useWeightedScoring = false,
  onEdit,
  onDelete,
  isExpanded = true,
  onToggle,
}: CategoryGroupProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between bg-gray-50 px-4 py-2 text-left hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
          <span className="font-medium text-gray-900">
            {category || "Uncategorized"}
          </span>
          <span className="text-sm text-gray-500">({items.length})</span>
        </div>
      </button>

      {/* Items */}
      {isExpanded && (
        <div className="p-2 space-y-2 bg-gray-50/50">
          {items.map((item) => (
            <CriteriaItemRow
              key={item.id}
              item={item}
              useWeightedScoring={useWeightedScoring}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CRITERIA ITEM EDITOR
// =============================================================================

export function CriteriaItemEditor({
  criteriaSet,
  items,
  isLoading = false,
  error,
  onAdd,
  onUpdate,
  onDelete,
  onBack,
  onRefresh,
  className = "",
}: CriteriaItemEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const editingItem = editingId ? items.find((i) => i.id === editingId) : null;
  const deletingItem = deletingId ? items.find((i) => i.id === deletingId) : null;

  // Group items by category
  const groupedItems = items.reduce<Record<string, EvalCriteriaItem[]>>(
    (acc, item) => {
      const cat = item.category || "";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  const categories = Object.keys(groupedItems).sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  const handleAdd = async (input: CreateCriteriaItemInput) => {
    try {
      setIsSaving(true);
      await onAdd(input);
      setIsAdding(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (input: UpdateCriteriaItemInput) => {
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
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="rounded p-1 text-gray-500 hover:bg-gray-100"
              title="Back"
            >
              ← Back
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {criteriaSet.name}
            </h2>
            <p className="text-sm text-gray-500">
              v{criteriaSet.version} • {items.length} criteria items
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded border bg-gray-100 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded px-3 py-1 text-xs font-medium ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("grouped")}
              className={`rounded px-3 py-1 text-xs font-medium ${
                viewMode === "grouped"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Grouped
            </button>
          </div>

          {/* Actions */}
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
              onClick={() => setIsAdding(true)}
              disabled={isLoading || isAdding}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Add Criteria Item</h3>
          <CriteriaItemForm
            isSaving={isSaving}
            useWeightedScoring={criteriaSet.useWeightedScoring}
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingItem && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Edit Criteria Item</h3>
          <CriteriaItemForm
            item={editingItem}
            isSaving={isSaving}
            useWeightedScoring={criteriaSet.useWeightedScoring}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && items.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          Loading criteria items...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No criteria items yet. Add one manually or import from spreadsheet.
        </div>
      )}

      {/* Items - List View */}
      {viewMode === "list" && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <CriteriaItemRow
              key={item.id}
              item={item}
              useWeightedScoring={criteriaSet.useWeightedScoring}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => setDeletingId(item.id)}
            />
          ))}
        </div>
      )}

      {/* Items - Grouped View */}
      {viewMode === "grouped" && items.length > 0 && (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryGroup
              key={cat || "__uncategorized"}
              category={cat || null}
              items={groupedItems[cat]}
              useWeightedScoring={criteriaSet.useWeightedScoring}
              onEdit={(item) => setEditingId(item.id)}
              onDelete={(item) => setDeletingId(item.id)}
              isExpanded={expandedCategories.has(cat || "__uncategorized")}
              onToggle={() => toggleCategory(cat || "__uncategorized")}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setDeletingId(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Criteria Item?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will delete <strong>{deletingItem.criteriaId}</strong>:{" "}
              {deletingItem.requirement.substring(0, 50)}
              {deletingItem.requirement.length > 50 ? "..." : ""}
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

export default CriteriaItemEditor;
