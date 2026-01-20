/**
 * StatusOptionManager - Status Option Management Component
 *
 * Admin component for CRUD operations on status options.
 * Supports both system-level and org-level status options.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 0.5 }} role="group" aria-label="Preset colors">
        {PRESET_COLORS.map((color) => (
          <IconButton
            key={color}
            onClick={() => onChange(color)}
            disabled={disabled}
            size="small"
            sx={{
              width: 24,
              height: 24,
              bgcolor: color,
              border: 2,
              borderColor: value === color ? "grey.900" : "transparent",
              transform: value === color ? "scale(1.1)" : "scale(1)",
              "&:hover": {
                bgcolor: color,
                transform: "scale(1.05)",
              },
            }}
            aria-label={`Select color ${color}`}
            aria-pressed={value === color}
          />
        ))}
      </Box>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        disabled={disabled}
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          cursor: "pointer",
          border: "1px solid",
          borderColor: "grey.300",
        }}
        aria-label="Custom color picker"
      />
    </Box>
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

      // Always include mode
      input.mode = mode;
      
      // Include isActive for org level
      if (!isSystemLevel) {
        input.isActive = isActive;
      }

      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isSaving}
        required
        fullWidth
        placeholder="e.g., Compliant, Non-Compliant"
      />

      <Box>
        <Typography variant="body2" fontWeight="medium" gutterBottom>
          Color
        </Typography>
        <ColorPicker value={color} onChange={setColor} disabled={isSaving} />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Score Value"
            type="number"
            value={scoreValue}
            onChange={(e) => setScoreValue(e.target.value)}
            disabled={isSaving}
            fullWidth
            inputProps={{ step: 0.1 }}
            placeholder="e.g., 1.0"
            helperText="Used for compliance scoring"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Display Order"
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            disabled={isSaving}
            fullWidth
          />
        </Grid>
      </Grid>

      <FormControl fullWidth>
        <InputLabel>Applies To</InputLabel>
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value as StatusOptionMode)}
          disabled={isSaving}
          label="Applies To"
        >
          {MODE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!isSystemLevel && (
        <FormControlLabel
          control={
            <Checkbox
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSaving}
            />
          }
          label="Active"
        />
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 1 }}>
        <Button
          onClick={onCancel}
          disabled={isSaving}
          variant="outlined"
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
    <Card
      className={className}
      sx={{
        opacity: isOrgOption && !statusOption.isActive ? 0.6 : 1,
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Color Badge */}
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "1px solid",
                borderColor: "grey.300",
                bgcolor: statusOption.color,
              }}
              title={statusOption.color}
            />

            {/* Name */}
            <Typography variant="body1" fontWeight="medium">
              {statusOption.name}
            </Typography>

            {/* Badges */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isSysOption && (
                <Chip
                  size="small"
                  label={
                    (statusOption as EvalSysStatusOption).mode === "both"
                      ? "All Modes"
                      : (statusOption as EvalSysStatusOption).mode === "boolean"
                      ? "Boolean"
                      : "Detailed"
                  }
                />
              )}
              {statusOption.scoreValue !== undefined && (
                <Chip
                  size="small"
                  label={`Score: ${statusOption.scoreValue}`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {isOrgOption && !statusOption.isActive && (
                <Chip size="small" label="Inactive" />
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              #{statusOption.orderIndex}
            </Typography>
            <IconButton onClick={onEdit} size="small" title="Edit">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={onDelete} size="small" title="Delete" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
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
  const [selectedTab, setSelectedTab] = useState<"boolean" | "detailed">("boolean");

  const editingOption = editingId
    ? statusOptions.find((o) => o.id === editingId)
    : null;

  const deletingOption = deletingId
    ? statusOptions.find((o) => o.id === deletingId)
    : null;

  // Filter and sort by mode and order index
  const filterByMode = (mode: "boolean" | "detailed") => {
    return statusOptions.filter((opt) => {
      const optMode = (opt as EvalSysStatusOption).mode;
      return optMode === mode || optMode === "both";
    });
  };

  const booleanOptions = filterByMode("boolean").sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const detailedOptions = filterByMode("detailed").sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const currentTabOptions = selectedTab === "boolean" ? booleanOptions : detailedOptions;

  const handleCreate = async (input: StatusOptionInput) => {
    try {
      setIsSaving(true);
      // Set mode based on selected tab
      input.mode = selectedTab;
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
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {isSystemLevel ? "System Status Options" : "Organization Status Options"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isSystemLevel
                ? "Default status options for all organizations"
                : "Status options for your organization"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {onRefresh && (
              <IconButton
                onClick={onRefresh}
                disabled={isLoading}
                size="small"
                title="Refresh"
              >
                <RefreshIcon />
              </IconButton>
            )}
            <Button
              onClick={() => setIsCreating(true)}
              disabled={isLoading || isCreating}
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
            >
              Add Option
            </Button>
          </Box>
        </Box>

        {/* Tabs - Show for both system and org level */}
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            value="boolean"
            label={
              <Badge badgeContent={booleanOptions.length} color="primary">
                <Box sx={{ pr: 2 }}>Boolean Mode</Box>
              </Badge>
            }
          />
          <Tab
            value="detailed"
            label={
              <Badge badgeContent={detailedOptions.length} color="primary">
                <Box sx={{ pr: 2 }}>Detailed Mode</Box>
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Create Form */}
      {isCreating && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              New Status Option
            </Typography>
            <StatusOptionForm
              isSystemLevel={isSystemLevel}
              isSaving={isSaving}
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editingOption && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Edit Status Option
            </Typography>
            <StatusOptionForm
              statusOption={editingOption}
              isSystemLevel={isSystemLevel}
              isSaving={isSaving}
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && statusOptions.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            Loading status options...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && currentTabOptions.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            No {selectedTab} mode status options yet. Create one to get started.
          </Typography>
        </Box>
      )}

      {/* Status Option List */}
      {currentTabOptions.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {currentTabOptions.map((option) => (
            <StatusOptionCard
              key={option.id}
              statusOption={option}
              onEdit={() => setEditingId(option.id)}
              onDelete={() => setDeletingId(option.id)}
            />
          ))}
        </Box>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingId && !!deletingOption}
        onClose={() => !isSaving && setDeletingId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Status Option?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will delete <strong>{deletingOption?.name}</strong>. Existing
            evaluations using this status will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeletingId(null)}
            disabled={isSaving}
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

export default StatusOptionManager;
