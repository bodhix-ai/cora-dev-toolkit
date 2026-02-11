"use client";

/**
 * Truth Set Upload Dialog
 * 
 * Handles JSON truth set file upload with:
 * - File selection and drag-and-drop
 * - Client-side JSON validation
 * - Preview API call before import
 * - Error handling and display
 */

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  CloudUpload,
  Description,
} from "@mui/icons-material";
import TruthSetPreviewDialog from "./TruthSetPreviewDialog";

// ============================================================================
// TYPES
// ============================================================================

interface TruthSetUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  onPreview: (file: File) => Promise<any>;
  onConfirmImport: (file: File) => Promise<any>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TruthSetUploadDialog({
  open,
  onClose,
  onUploadSuccess,
  onPreview,
  onConfirmImport,
}: TruthSetUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset dialog state
  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setPreviewData(null);
    setShowPreview(false);
    onClose();
  };

  // Validate JSON file
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.endsWith('.json')) {
      return "Please upload a JSON file";
    }

    // Check file size (max 5MB for JSON)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return "File size exceeds 5MB limit";
    }

    return null;
  };

  // Parse and validate JSON structure
  const validateJsonStructure = async (file: File): Promise<string | null> => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Basic structure validation
      if (!json.run_id) {
        return "Missing required field: run_id";
      }
      if (!json.workspace_id) {
        return "Missing required field: workspace_id";
      }
      if (!json.sections || !Array.isArray(json.sections)) {
        return "Missing or invalid sections array";
      }
      if (!json.documents || !Array.isArray(json.documents)) {
        return "Missing or invalid documents array";
      }

      return null;
    } catch (err) {
      return "Invalid JSON format";
    }
  };

  // Handle file selection
  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    setError(null);
    setSelectedFile(null);

    // Validate file
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    // Validate JSON structure
    const structureError = await validateJsonStructure(file);
    if (structureError) {
      setError(structureError);
      return;
    }

    setSelectedFile(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && !importing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (loading || importing) return;

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  // Handle click to browse
  const handleClickBrowse = () => {
    if (!loading && !importing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle preview
  const handlePreview = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await onPreview(selectedFile);
      setPreviewData(result);
      setShowPreview(true);
    } catch (err: any) {
      console.error("Preview error:", err);
      setError(err.message || "Failed to preview truth set");
    } finally {
      setLoading(false);
    }
  };

  // Handle import confirmation
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError(null);

    try {
      await onConfirmImport(selectedFile);
      setShowPreview(false);
      handleClose();
      onUploadSuccess();
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Failed to import truth set");
      setShowPreview(false);
    } finally {
      setImporting(false);
    }
  };

  // Handle preview dialog close
  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudUpload />
            <Typography variant="h6">
              Upload Truth Set
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Instructions */}
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload a JSON file containing truth set data. The file must match the template format
            with run_id, sections, documents, and evaluations.
          </Alert>

          {/* File Upload Area */}
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickBrowse}
            sx={{
              p: 4,
              border: `2px dashed ${isDragging ? "primary.main" : "divider"}`,
              borderRadius: 2,
              backgroundColor: isDragging 
                ? "action.hover" 
                : (loading || importing ? "action.disabledBackground" : "background.paper"),
              textAlign: "center",
              cursor: loading || importing ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: loading || importing ? "divider" : "primary.main",
                backgroundColor: loading || importing ? "action.disabledBackground" : "action.hover",
              },
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              disabled={loading || importing}
              style={{ display: "none" }}
            />

            {loading ? (
              <Box>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Validating...
                </Typography>
              </Box>
            ) : (
              <Box>
                <Description sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  {isDragging ? "Drop JSON file here" : "Drag and drop JSON file here"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Accepted: .json (max 5MB)
                </Typography>
              </Box>
            )}
          </Box>

          {/* Selected File */}
          {selectedFile && !error && (
            <Alert severity="success" icon={<Description />} sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Typography>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit" disabled={loading || importing}>
            Cancel
          </Button>
          <Button
            onClick={handlePreview}
            variant="contained"
            disabled={!selectedFile || loading || importing}
          >
            {loading ? "Validating..." : "Preview Truth Set"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <TruthSetPreviewDialog
        open={showPreview}
        onClose={handlePreviewClose}
        onConfirmImport={handleConfirmImport}
        previewData={previewData}
        loading={importing}
      />
    </>
  );
}