/**
 * CriteriaItemEditor - Criteria Item Editor Component
 *
 * Admin component for viewing and editing individual criteria items.
 * Supports inline editing, reordering, and bulk operations.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ViewList as ListIcon,
  ViewModule as GroupedIcon,
} from "@mui/icons-material";
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
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            id="item-criteria-id"
            label="Criteria ID"
            value={criteriaId}
            onChange={(e) => setCriteriaId(e.target.value)}
            disabled={isSaving}
            fullWidth
            required
            placeholder="e.g., AC-1, SI-3"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            id="item-category"
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSaving}
            fullWidth
            placeholder="e.g., Access Control"
          />
        </Grid>
      </Grid>

      <TextField
        id="item-requirement"
        label="Requirement"
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        disabled={isSaving}
        multiline
        rows={2}
        fullWidth
        required
        placeholder="The requirement text..."
      />

      <TextField
        id="item-description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isSaving}
        multiline
        rows={2}
        fullWidth
        placeholder="Additional details about the requirement..."
      />

      {useWeightedScoring && (
        <TextField
          id="item-weight"
          label="Weight"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          disabled={isSaving}
          sx={{ width: 120 }}
          inputProps={{ min: "0.1", step: "0.1" }}
        />
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}>
        <Button
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          variant="contained"
        >
          {isSaving ? "Saving..." : isEdit ? "Update" : "Add"}
        </Button>
      </Box>
    </Box>
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
    <Paper
      variant="outlined"
      className={className}
      sx={{
        p: 2,
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        opacity: item.isActive ? 1 : 0.6,
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      {/* Criteria ID */}
      <Box sx={{ width: 80, flexShrink: 0 }}>
        <Typography variant="body2" fontFamily="monospace" fontWeight="medium" color="primary">
          {item.criteriaId}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2">{item.requirement}</Typography>
        {item.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.description}
          </Typography>
        )}
      </Box>

      {/* Category & Weight */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        {item.category && (
          <Chip label={item.category} size="small" />
        )}
        {useWeightedScoring && (
          <Typography variant="caption" color="text.secondary" title="Weight">
            ⚖️ {item.weight}
          </Typography>
        )}
        {!item.isActive && (
          <Chip label="Inactive" size="small" color="default" />
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
        <IconButton size="small" onClick={onEdit} title="Edit">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onDelete} title="Delete" color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
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
    <Accordion expanded={isExpanded} onChange={onToggle}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography fontWeight="medium">
            {category || "Uncategorized"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({items.length})
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: "grey.50" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.map((item) => (
            <CriteriaItemRow
              key={item.id}
              item={item}
              useWeightedScoring={useWeightedScoring}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
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

  const editingItem = editingId ? items.find((i) => i.id === editingId) : null;
  const deletingItem = deletingId ? items.find((i) => i.id === deletingId) : null;

  // Group items by category
  const groupedItems = (items || []).reduce<Record<string, EvalCriteriaItem[]>>(
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
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          {onBack && (
            <IconButton onClick={onBack} title="Back">
              <BackIcon />
            </IconButton>
          )}
          <Box>
            <Typography variant="h6">{criteriaSet.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              v{criteriaSet.version} • {items.length} criteria items
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          {/* View Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="list">
              <ListIcon fontSize="small" sx={{ mr: 0.5 }} />
              List
            </ToggleButton>
            <ToggleButton value="grouped">
              <GroupedIcon fontSize="small" sx={{ mr: 0.5 }} />
              Grouped
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                disabled={isLoading}
                startIcon={<RefreshIcon />}
              >
                Refresh
              </Button>
            )}
            <Button
              onClick={() => setIsAdding(true)}
              disabled={isLoading || isAdding}
              variant="contained"
            >
              + Add Item
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add Form */}
      {isAdding && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Add Criteria Item
          </Typography>
          <CriteriaItemForm
            isSaving={isSaving}
            useWeightedScoring={criteriaSet.useWeightedScoring}
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        </Paper>
      )}

      {/* Edit Form */}
      {editingItem && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Edit Criteria Item
          </Typography>
          <CriteriaItemForm
            item={editingItem}
            isSaving={isSaving}
            useWeightedScoring={criteriaSet.useWeightedScoring}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
          />
        </Paper>
      )}

      {/* Loading */}
      {isLoading && items.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Loading criteria items...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No criteria items yet. Add one manually or import from spreadsheet.
          </Typography>
        </Box>
      )}

      {/* Items - List View */}
      {viewMode === "list" && items.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.map((item) => (
            <CriteriaItemRow
              key={item.id}
              item={item}
              useWeightedScoring={criteriaSet.useWeightedScoring}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => setDeletingId(item.id)}
            />
          ))}
        </Box>
      )}

      {/* Items - Grouped View */}
      {viewMode === "grouped" && items.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {categories.map((cat) => (
            <CategoryGroup
              key={cat || "__uncategorized"}
              category={cat || null}
              items={groupedItems[cat]}
              useWeightedScoring={criteriaSet.useWeightedScoring}
              onEdit={(item) => setEditingId(item.id)}
              onDelete={(item) => setDeletingId(item.id)}
              isExpanded
            />
          ))}
        </Box>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingId && !!deletingItem}
        onClose={() => !isSaving && setDeletingId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Criteria Item?</DialogTitle>
        <DialogContent>
          {deletingItem && (
            <Typography>
              This will delete <strong>{deletingItem.criteriaId}</strong>:{" "}
              {deletingItem.requirement.substring(0, 50)}
              {deletingItem.requirement.length > 50 ? "..." : ""}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isSaving}
            color="error"
            variant="contained"
          >
            {isSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CriteriaItemEditor;
