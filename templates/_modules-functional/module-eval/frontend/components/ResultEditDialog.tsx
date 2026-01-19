/**
 * ResultEditDialog - Result Editing Dialog Component
 *
 * Modal dialog for editing evaluation criteria results.
 * Allows editing narrative and status with notes.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Alert,
  IconButton,
  Paper,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
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

  if (!result) return null;

  const hasChanges =
    editedResult !== (result.currentEdit?.editedResult ?? result.aiResult?.result ?? "") ||
    editedStatusId !== (result.currentEdit?.editedStatusId ?? result.aiResult?.statusId);

  return (
    <Dialog
      open={isOpen}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" && isSaving) return;
        onClose();
      }}
      maxWidth="md"
      fullWidth
      className={className}
    >
      {/* Header */}
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" component="div">
              Edit Result
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {result.criteriaItem.criteriaId} - {result.criteriaItem.requirement}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            disabled={isSaving}
            size="small"
            aria-label="Close dialog"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body */}
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Original AI Result (read-only) */}
          {result.aiResult?.result && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Original AI Response
                </Typography>
                {result.aiResult.confidence !== undefined && (
                  <Typography variant="caption" color="text.secondary">
                    Confidence: {result.aiResult.confidence}%
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {result.aiResult.result}
              </Typography>
            </Paper>
          )}

          {/* Edited Result */}
          <TextField
            id="edited-result"
            label="Edited Response"
            value={editedResult}
            onChange={(e) => setEditedResult(e.target.value)}
            disabled={isSaving}
            multiline
            rows={6}
            fullWidth
            placeholder="Enter your edited response..."
          />

          {/* Status Selection */}
          <FormControl fullWidth>
            <InputLabel id="edited-status-label">Status</InputLabel>
            <Select
              labelId="edited-status-label"
              id="edited-status"
              value={editedStatusId || ""}
              label="Status"
              onChange={(e) => setEditedStatusId(e.target.value || undefined)}
              disabled={isSaving}
            >
              <MenuItem value="">
                <em>Select status...</em>
              </MenuItem>
              {statusOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Edit Notes */}
          <TextField
            id="edit-notes"
            label="Edit Notes (optional)"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            disabled={isSaving}
            multiline
            rows={2}
            fullWidth
            placeholder="Why are you making this edit?"
          />

          {/* Error Message */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Previous Edit Info */}
          {result.hasEdit && result.currentEdit && (
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Previous edit:</strong> by{" "}
                {result.currentEdit.editorName || "Unknown"} on{" "}
                {new Date(result.currentEdit.createdAt).toLocaleDateString()}
              </Typography>
              {result.currentEdit.editNotes && (
                <Typography variant="body2" fontStyle="italic" sx={{ mt: 0.5 }}>
                  Note: {result.currentEdit.editNotes}
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          variant="contained"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
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
  return (
    <Dialog
      open={isOpen}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" && isLoading) return;
        onCancel();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          variant="contained"
          color={destructive ? "error" : "primary"}
        >
          {isLoading ? "Loading..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ResultEditDialog;
