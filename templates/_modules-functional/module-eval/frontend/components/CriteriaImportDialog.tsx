/**
 * CriteriaImportDialog - Criteria Set Import from Spreadsheet
 *
 * Dialog component for importing criteria items from CSV/XLSX files.
 * Includes file selection, preview, and import progress.
 */

"use client";

import React, { useState, useRef } from "react";
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
  Grid,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Description as FileIcon,
  TableChart as ExcelIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type {
  EvalDocType,
  ImportCriteriaSetInput,
  ImportCriteriaSetResult,
  ImportError,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface CriteriaImportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Available document types */
  docTypes: EvalDocType[];
  /** Pre-selected doc type ID */
  defaultDocTypeId?: string;
  /** Whether import is in progress */
  isImporting?: boolean;
  /** Import result (after completion) */
  importResult?: ImportCriteriaSetResult | null;
  /** Callback when import is requested */
  onImport: (input: ImportCriteriaSetInput) => Promise<ImportCriteriaSetResult>;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback after successful import */
  onSuccess?: (result: ImportCriteriaSetResult) => void;
}

export interface FilePreviewProps {
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** File type */
  fileType: "csv" | "xlsx";
  /** Callback to remove file */
  onRemove: () => void;
}

export interface ImportResultDisplayProps {
  /** Import result */
  result: ImportCriteriaSetResult;
  /** Callback to close */
  onClose: () => void;
  /** Callback to import another */
  onImportAnother?: () => void;
}

export interface ImportErrorListProps {
  /** Import errors */
  errors: ImportError[];
  /** Maximum errors to show */
  maxErrors?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:text/csv;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// =============================================================================
// FILE PREVIEW
// =============================================================================

export function FilePreview({
  fileName,
  fileSize,
  fileType,
  onRemove,
}: FilePreviewProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {fileType === "xlsx" ? (
            <ExcelIcon color="success" fontSize="large" />
          ) : (
            <FileIcon color="primary" fontSize="large" />
          )}
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(fileSize)} • {fileType.toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onRemove} size="small" title="Remove file" aria-label="Remove file">
          <CloseIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

// =============================================================================
// IMPORT ERROR LIST
// =============================================================================

export function ImportErrorList({
  errors,
  maxErrors = 10,
}: ImportErrorListProps) {
  const displayErrors = errors.slice(0, maxErrors);
  const hasMore = errors.length > maxErrors;

  if (errors.length === 0) return null;

  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Import Errors ({errors.length})
      </Typography>
      <List dense disablePadding>
        {displayErrors.map((err, idx) => (
          <ListItem key={idx} disablePadding sx={{ display: "flex", gap: 1 }}>
            <Typography variant="caption" component="span" fontWeight="medium">
              Row {err.row}:
            </Typography>
            <Typography variant="caption" component="span">
              {err.error}
            </Typography>
            {err.criteriaId && (
              <Typography variant="caption" component="span" color="error.dark">
                ({err.criteriaId})
              </Typography>
            )}
          </ListItem>
        ))}
      </List>
      {hasMore && (
        <Typography variant="caption" color="error.dark" sx={{ mt: 1, display: "block" }}>
          ... and {errors.length - maxErrors} more errors
        </Typography>
      )}
    </Alert>
  );
}

// =============================================================================
// IMPORT RESULT DISPLAY
// =============================================================================

export function ImportResultDisplay({
  result,
  onClose,
  onImportAnother,
}: ImportResultDisplayProps) {
  const hasErrors = result.errorCount > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Success Banner */}
      <Alert
        severity={hasErrors ? "warning" : "success"}
        icon={hasErrors ? <WarningIcon /> : <SuccessIcon />}
      >
        <Typography variant="subtitle2">
          {hasErrors
            ? "Import completed with errors"
            : "Import successful!"}
        </Typography>
        <Typography variant="body2">
          Created criteria set: <strong>{result.name}</strong> (v{result.version})
        </Typography>
      </Alert>

      {/* Stats */}
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h5" fontWeight="bold">
              {result.totalRows}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Rows
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {result.successCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Imported
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={result.errorCount > 0 ? "error.main" : "text.disabled"}
            >
              {result.errorCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Errors
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Errors */}
      {result.errors.length > 0 && (
        <ImportErrorList errors={result.errors} />
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}>
        {onImportAnother && (
          <Button onClick={onImportAnother}>
            Import Another
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// CRITERIA IMPORT DIALOG
// =============================================================================

export function CriteriaImportDialog({
  isOpen,
  docTypes,
  defaultDocTypeId,
  isImporting = false,
  importResult,
  onImport,
  onClose,
  onSuccess,
}: CriteriaImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docTypeId, setDocTypeId] = useState(defaultDocTypeId || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [useWeightedScoring, setUseWeightedScoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<ImportCriteriaSetResult | null>(null);

  const activeDocTypes = docTypes.filter((dt) => dt.isActive);
  const result = importResult || localResult;

  const resetForm = () => {
    setDocTypeId(defaultDocTypeId || "");
    setName("");
    setDescription("");
    setVersion("1.0");
    setUseWeightedScoring(false);
    setFile(null);
    setError(null);
    setLocalResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx") {
      setError("Please select a CSV or XLSX file");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Auto-fill name from filename if empty
    if (!name) {
      const baseName = selectedFile.name.replace(/\.(csv|xlsx)$/i, "");
      setName(baseName);
    }
  };

  const handleImport = async () => {
    if (!docTypeId) {
      setError("Please select a document type");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }

    if (!file) {
      setError("Please select a file");
      return;
    }

    try {
      setError(null);
      const ext = file.name.split(".").pop()?.toLowerCase() as "csv" | "xlsx";
      const fileContent = await fileToBase64(file);

      const input: ImportCriteriaSetInput = {
        docTypeId,
        name: name.trim(),
        description: description.trim() || undefined,
        version: version.trim() || undefined,
        useWeightedScoring,
        fileContent,
        fileName: file.name,
        fileType: ext,
      };

      const importRes = await onImport(input);
      setLocalResult(importRes);
      onSuccess?.(importRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const handleImportAnother = () => {
    resetForm();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" && isImporting) return;
        handleClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      {/* Header */}
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">Import Criteria Set</Typography>
          <IconButton
            onClick={handleClose}
            disabled={isImporting}
            size="small"
            aria-label="Close dialog"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent dividers>
        {result ? (
          <ImportResultDisplay
            result={result}
            onClose={handleClose}
            onImportAnother={handleImportAnother}
          />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* File Drop Zone */}
            <Box>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Spreadsheet File <Box component="span" color="error.main">*</Box>
              </Typography>
              {file ? (
                <FilePreview
                  fileName={file.name}
                  fileSize={file.size}
                  fileType={
                    file.name.endsWith(".xlsx") ? "xlsx" : "csv"
                  }
                  onRemove={() => setFile(null)}
                />
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    borderStyle: "dashed",
                    borderWidth: 2,
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Click to select or drag & drop
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                    CSV or XLSX, max 5MB
                  </Typography>
                </Paper>
              )}
              <input
                ref={fileInputRef}
                id="import-file-input"
                aria-label="Upload spreadsheet file"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </Box>

            {/* Document Type */}
            <FormControl fullWidth required>
              <InputLabel id="import-doctype-label">Document Type</InputLabel>
              <Select
                labelId="import-doctype-label"
                id="import-doctype"
                value={docTypeId}
                label="Document Type"
                onChange={(e) => setDocTypeId(e.target.value)}
                disabled={isImporting}
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

            {/* Name */}
            <TextField
              id="import-name"
              label="Criteria Set Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isImporting}
              fullWidth
              required
              placeholder="e.g., NIST 800-53 Controls"
            />

            {/* Version & Weighted */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  id="import-version"
                  label="Version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={isImporting}
                  fullWidth
                  placeholder="1.0"
                />
              </Grid>
              <Grid item xs={6} sx={{ display: "flex", alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="import-weighted"
                      checked={useWeightedScoring}
                      onChange={(e) => setUseWeightedScoring(e.target.checked)}
                      disabled={isImporting}
                      aria-label="Use weighted scoring"
                    />
                  }
                  label="Weighted scoring"
                />
              </Grid>
            </Grid>

            {/* Description */}
            <TextField
              id="import-description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isImporting}
              multiline
              rows={2}
              fullWidth
              placeholder="Optional description..."
            />

            {/* Format Help */}
            <Alert severity="info">
              <Typography variant="caption" fontWeight="medium" display="block" gutterBottom>
                Expected columns:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0, "& li": { fontSize: "0.75rem", mb: 0.5 } }}>
                <li>
                  <code>criteria_id</code> (required) - e.g., "AC-1", "SI-3"
                </li>
                <li>
                  <code>requirement</code> (required) - The criteria requirement text
                </li>
                <li>
                  <code>description</code> (optional) - Detailed description
                </li>
                <li>
                  <code>category</code> (optional) - Category/grouping
                </li>
                <li>
                  <code>weight</code> (optional) - Scoring weight (default: 1)
                </li>
              </Box>
            </Alert>

            {/* Error */}
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      {!result && (
        <DialogActions>
          <Button onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !file || !docTypeId || !name.trim()}
            variant="contained"
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export default CriteriaImportDialog;
