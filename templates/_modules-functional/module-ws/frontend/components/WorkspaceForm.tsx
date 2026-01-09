/**
 * WorkspaceForm Component
 *
 * Form dialog for creating and editing workspaces.
 */

import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Add, Edit } from "@mui/icons-material";
import type { Workspace, WorkspaceFormValues } from "../types";
import { DEFAULT_WORKSPACE_FORM } from "../types";
import { useWorkspaceForm } from "../hooks/useWorkspaceForm";
import { ColorPicker } from "./ColorPicker";
import { TagInput } from "./TagInput";

export interface WorkspaceFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Existing workspace for edit mode (null for create mode) */
  workspace?: Workspace | null;
  /** Organization ID for creating new workspace */
  orgId?: string;
  /** Callback when workspace is created */
  onCreateSuccess?: (workspace: Workspace) => void;
  /** Callback when workspace is updated */
  onUpdateSuccess?: (workspace: Workspace) => void;
  /** API client create function */
  onCreate?: (orgId: string, values: WorkspaceFormValues) => Promise<Workspace>;
  /** API client update function */
  onUpdate?: (workspaceId: string, values: Partial<WorkspaceFormValues>) => Promise<Workspace>;
  /** Maximum tags allowed */
  maxTags?: number;
  /** Maximum tag length */
  maxTagLength?: number;
}

export function WorkspaceForm({
  open,
  onClose,
  workspace,
  orgId,
  onCreateSuccess,
  onUpdateSuccess,
  onCreate,
  onUpdate,
  maxTags = 10,
  maxTagLength = 30,
}: WorkspaceFormProps): React.ReactElement {
  const isEditMode = Boolean(workspace);
  
  // Memoize initialValues to prevent unnecessary recalculations
  // that would cause isDirty to produce unstable results
  const initialFormValues = useMemo(
    () =>
      workspace
        ? {
            name: workspace.name,
            description: workspace.description || "",
            color: workspace.color,
            icon: workspace.icon,
            tags: workspace.tags,
          }
        : DEFAULT_WORKSPACE_FORM,
    [workspace]
  );

  const {
    values,
    errors,
    isDirty,
    setFieldValue,
    validateAll,
    reset,
  } = useWorkspaceForm({
    initialValues: initialFormValues,
  });

  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Reset form when dialog opens/closes or workspace changes
  useEffect(() => {
    if (open) {
      // For edit mode, the initialValues in hook will handle the values
      // For create mode, reset to defaults
      if (!workspace) {
        reset();
      }
      setSubmitError(null);
    }
  }, [open, workspace, reset]);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!validateAll()) {
      setSubmitError("Please fix the validation errors before saving");
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      if (isEditMode && workspace && onUpdate) {
        const updated = await onUpdate(workspace.id, values);
        onUpdateSuccess?.(updated);
        onClose();
      } else if (orgId && onCreate) {
        const created = await onCreate(orgId, values);
        onCreateSuccess?.(created);
        onClose();
      } else {
        setSubmitError("Missing required configuration");
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagsChange = (newTags: string[]) => {
    setFieldValue("tags", newTags);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isEditMode ? (
            <>
              <Edit color="primary" />
              <Typography variant="h6">Edit Workspace</Typography>
            </>
          ) : (
            <>
              <Add color="primary" />
              <Typography variant="h6">Create Workspace</Typography>
            </>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Name field */}
          <TextField
            label="Name"
            value={values.name}
            onChange={(e) => setFieldValue("name", e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name || "Give your workspace a descriptive name"}
            fullWidth
            required
            disabled={isLoading}
            autoFocus
            inputProps={{ maxLength: 100 }}
          />

          {/* Description field */}
          <TextField
            label="Description"
            value={values.description}
            onChange={(e) => setFieldValue("description", e.target.value)}
            error={Boolean(errors.description)}
            helperText={errors.description || "Optional description for your workspace"}
            fullWidth
            multiline
            rows={3}
            disabled={isLoading}
            inputProps={{ maxLength: 500 }}
          />

          {/* Color picker */}
          <ColorPicker
            value={values.color}
            onChange={(color) => setFieldValue("color", color)}
            label="Color"
            error={errors.color}
            disabled={isLoading}
          />

          {/* Tags input */}
          <TagInput
            value={values.tags}
            onChange={handleTagsChange}
            label="Tags"
            error={errors.tags}
            disabled={isLoading}
            maxTags={maxTags}
            maxTagLength={maxTagLength}
            placeholder="Add tags for organization..."
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || (!isDirty && isEditMode)}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {isLoading
            ? isEditMode
              ? "Saving..."
              : "Creating..."
            : isEditMode
            ? "Save Changes"
            : "Create Workspace"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkspaceForm;
