/**
 * DocTypeManager - Document Type Management Component
 *
 * Admin component for CRUD operations on document types.
 * Includes create, edit, and delete functionality.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
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
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <TextField
        id="doctype-name"
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isSaving}
        placeholder="e.g., IT Security Policy"
        required
        fullWidth
        size="small"
      />

      <TextField
        id="doctype-description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isSaving}
        placeholder="Brief description of this document type..."
        multiline
        rows={3}
        fullWidth
        size="small"
      />

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, pt: 1 }}>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          variant="text"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          variant="contained"
          color="primary"
        >
          {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </Box>
    </Box>
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
    <Card
      className={className}
      sx={{
        opacity: docType.isActive ? 1 : 0.6,
        backgroundColor: docType.isActive ? "background.paper" : "grey.50",
        transition: "box-shadow 0.2s",
        "&:hover": {
          boxShadow: 2,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={500}>
                {docType.name}
              </Typography>
              {!docType.isActive && (
                <Chip label="Inactive" size="small" color="default" />
              )}
            </Box>
            {docType.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {docType.description}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {docType.criteriaSetsCount ?? 0} criteria set
                {docType.criteriaSetsCount !== 1 ? "s" : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created {new Date(docType.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              onClick={onEdit}
              size="small"
              color="default"
              title="Edit"
              aria-label="Edit document type"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={onDelete}
              size="small"
              color="error"
              title="Delete"
              aria-label="Delete document type"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
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

  const handleCreate = async (input: CreateDocTypeInput | UpdateDocTypeInput) => {
    try {
      setIsSaving(true);
      await onCreate(input as CreateDocTypeInput);
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (input: CreateDocTypeInput | UpdateDocTypeInput) => {
    if (!editingId) return;
    try {
      setIsSaving(true);
      await onUpdate(editingId, input as UpdateDocTypeInput);
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
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Document Types
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Categorize documents for evaluation
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              startIcon={<RefreshIcon />}
              variant="text"
              size="small"
            >
              Refresh
            </Button>
          )}
          <Button
            onClick={() => setIsCreating(true)}
            disabled={isLoading || isCreating}
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
          >
            New Doc Type
          </Button>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Create Form */}
      {isCreating && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 2 }}>
              New Document Type
            </Typography>
            <DocTypeForm
              isSaving={isSaving}
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editingDocType && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 2 }}>
              Edit Document Type
            </Typography>
            <DocTypeForm
              docType={editingDocType}
              isSaving={isSaving}
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && docTypes.length === 0 && (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">
            Loading document types...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && docTypes.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            No document types yet. Create one to get started.
          </Typography>
        </Box>
      )}

      {/* Doc Type List */}
      {docTypes.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {docTypes.map((docType) => (
            <DocTypeCard
              key={docType.id}
              docType={docType}
              onEdit={() => setEditingId(docType.id)}
              onDelete={() => setDeletingId(docType.id)}
            />
          ))}
        </Box>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingId}
        onClose={() => !isSaving && setDeletingId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Document Type?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will also affect any evaluations using this document type.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeletingId(null)}
            disabled={isSaving}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isSaving}
            variant="contained"
            color="error"
          >
            {isSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DocTypeManager;
