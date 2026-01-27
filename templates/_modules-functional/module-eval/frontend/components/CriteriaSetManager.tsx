/**
 * CriteriaSetManager - Criteria Set Management Component
 *
 * Admin component for CRUD operations on criteria sets.
 * Includes create, edit, delete, and import functionality.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CloudUpload as ImportIcon,
  Assignment as ViewIcon,
} from "@mui/icons-material";
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
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {!isEdit && (
        <FormControl fullWidth required>
          <InputLabel id="criteriaset-doctype-label">Document Type</InputLabel>
          <Select
            labelId="criteriaset-doctype-label"
            id="criteriaset-doctype"
            value={docTypeId}
            label="Document Type"
            onChange={(e) => setDocTypeId(e.target.value)}
            disabled={isSaving}
          >
            <MenuItem value="">
              <em>Select a document type...</em>
            </MenuItem>
            {activeDocTypes.map((dt) => (
              <MenuItem key={dt.id} value={dt.id}>
                {dt.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        id="criteriaset-name"
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isSaving}
        fullWidth
        required
        placeholder="e.g., NIST 800-53 Controls"
      />

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            id="criteriaset-version"
            label="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={isSaving}
            fullWidth
            placeholder="e.g., 1.0"
          />
        </Grid>
        <Grid item xs={6} sx={{ display: "flex", alignItems: "center" }}>
          <FormControlLabel
            control={
              <Checkbox
                id="criteriaset-weighted"
                checked={useWeightedScoring}
                onChange={(e) => setUseWeightedScoring(e.target.checked)}
                disabled={isSaving}
                aria-label="Use weighted scoring"
              />
            }
            label="Use weighted scoring"
          />
        </Grid>
      </Grid>

      <TextField
        id="criteriaset-description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isSaving}
        multiline
        rows={3}
        fullWidth
        placeholder="Brief description of this criteria set..."
      />

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}>
        <Button onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} variant="contained">
          {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </Box>
    </Box>
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
    <Card
      className={className}
      sx={{
        opacity: criteriaSet.isActive ? 1 : 0.6,
        bgcolor: criteriaSet.isActive ? "background.paper" : "grey.50",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {criteriaSet.name}
              </Typography>
              <Chip label={`v${criteriaSet.version}`} size="small" />
              {criteriaSet.useWeightedScoring && (
                <Chip label="Weighted" color="primary" size="small" />
              )}
              {!criteriaSet.isActive && (
                <Chip label="Inactive" size="small" />
              )}
            </Box>
            {criteriaSet.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {criteriaSet.description}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary">
                {criteriaSet.itemCount ?? 0} criteria item
                {criteriaSet.itemCount !== 1 ? "s" : ""}
              </Typography>
              {criteriaSet.sourceFileName && (
                <Typography variant="caption" color="text.secondary" title="Imported from file">
                  📄 {criteriaSet.sourceFileName}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Created {new Date(criteriaSet.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ ml: 2, display: "flex", gap: 0.5, flexShrink: 0 }}>
            {onViewItems && (
              <IconButton size="small" onClick={onViewItems} title="View Criteria Items" aria-label="View criteria items">
                <ViewIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={onEdit} title="Edit" aria-label="Edit criteria set">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onDelete} title="Delete" color="error" aria-label="Delete criteria set">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
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

  const handleCreate = async (input: CreateCriteriaSetInput | UpdateCriteriaSetInput) => {
    try {
      setIsSaving(true);
      await onCreate(input as CreateCriteriaSetInput);
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (input: CreateCriteriaSetInput | UpdateCriteriaSetInput) => {
    if (!editingId) return;
    try {
      setIsSaving(true);
      await onUpdate(editingId, input as UpdateCriteriaSetInput);
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
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h6">Criteria Sets</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage evaluation criteria for document types
          </Typography>
        </Box>
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
          {onImport && (
            <Button
              onClick={onImport}
              disabled={isLoading || isCreating}
              variant="outlined"
              startIcon={<ImportIcon />}
            >
              Import
            </Button>
          )}
          <Button
            onClick={() => setIsCreating(true)}
            disabled={isLoading || isCreating}
            variant="contained"
          >
            + New Criteria Set
          </Button>
        </Box>
      </Box>

      {/* Filter */}
      {onFilterChange && docTypes.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel id="doctype-filter-label">Filter by Document Type</InputLabel>
          <Select
            labelId="doctype-filter-label"
            id="doctype-filter"
            value={selectedDocTypeId || ""}
            label="Filter by Document Type"
            onChange={(e) => onFilterChange(e.target.value || undefined)}
          >
            <MenuItem value="">All Document Types</MenuItem>
            {docTypes
              .filter((dt) => dt.isActive)
              .map((dt) => (
                <MenuItem key={dt.id} value={dt.id}>
                  {dt.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Create Form */}
      {isCreating && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            New Criteria Set
          </Typography>
          <CriteriaSetForm
            docTypes={docTypes}
            defaultDocTypeId={selectedDocTypeId}
            isSaving={isSaving}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </Paper>
      )}

      {/* Edit Form */}
      {editingCriteriaSet && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Edit Criteria Set
          </Typography>
          <CriteriaSetForm
            criteriaSet={editingCriteriaSet}
            docTypes={docTypes}
            isSaving={isSaving}
            onSubmit={handleUpdate}
            onCancel={() => setEditingId(null)}
          />
        </Paper>
      )}

      {/* Loading */}
      {isLoading && criteriaSets.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Loading criteria sets...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && filteredCriteriaSets.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            {selectedDocTypeId
              ? "No criteria sets for this document type. Create one or import from spreadsheet."
              : "No criteria sets yet. Create one to get started."}
          </Typography>
        </Box>
      )}

      {/* Criteria Set List */}
      {filteredCriteriaSets.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredCriteriaSets.map((criteriaSet) => (
            <CriteriaSetCard
              key={criteriaSet.id}
              criteriaSet={criteriaSet}
              onEdit={() => setEditingId(criteriaSet.id)}
              onDelete={() => setDeletingId(criteriaSet.id)}
              onViewItems={onViewItems ? () => onViewItems(criteriaSet) : undefined}
            />
          ))}
        </Box>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingId && !!deletingCriteriaSet}
        onClose={() => !isSaving && setDeletingId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Criteria Set?</DialogTitle>
        <DialogContent>
          {deletingCriteriaSet && (
            <Typography>
              This will delete <strong>{deletingCriteriaSet.name}</strong> and
              all its {deletingCriteriaSet.itemCount ?? 0} criteria items. This
              action cannot be undone.
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

export default CriteriaSetManager;
