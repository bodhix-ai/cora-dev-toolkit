"use client";

/**
 * Truth Set Preview Dialog
 * 
 * Displays validation results before importing a truth set JSON file.
 * Shows:
 * - Validation status (success/errors)
 * - Summary metrics (documents, evaluations, sections)
 * - Document-by-document breakdown
 * - Warning messages (low confidence, etc.)
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
} from "@mui/icons-material";

// ============================================================================
// TYPES
// ============================================================================

interface PreviewDocument {
  document_name: string;
  evaluations_count: number;
  status: "valid" | "error";
}

interface PreviewData {
  valid: boolean;
  summary: {
    documents: number;
    evaluations: number;
    sections: number;
  };
  documents?: PreviewDocument[];
  warnings?: string[];
  errors?: string[];
}

interface TruthSetPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirmImport: () => void;
  previewData: PreviewData | null;
  loading: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TruthSetPreviewDialog({
  open,
  onClose,
  onConfirmImport,
  previewData,
  loading,
}: TruthSetPreviewDialogProps) {
  if (!previewData) return null;

  const hasErrors = !previewData.valid || (previewData.errors && previewData.errors.length > 0);
  const hasWarnings = previewData.warnings && previewData.warnings.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {hasErrors ? (
            <ErrorIcon color="error" />
          ) : (
            <CheckCircle color="success" />
          )}
          <Typography variant="h6">
            Truth Set Preview
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Validation Status */}
        {hasErrors ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Failed
            </Typography>
            {previewData.errors && (
              <List dense>
                {previewData.errors.map((error, idx) => (
                  <ListItem key={idx} sx={{ py: 0 }}>
                    <ListItemText
                      primary={error}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Alert>
        ) : (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              ✅ Validation Passed
            </Typography>
            <Typography variant="body2">
              {previewData.summary.documents} documents with{" "}
              {previewData.summary.evaluations} evaluations across{" "}
              {previewData.summary.sections} sections
            </Typography>
          </Alert>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Warnings:
            </Typography>
            <List dense>
              {previewData.warnings!.map((warning, idx) => (
                <ListItem key={idx} sx={{ py: 0 }}>
                  <ListItemText
                    primary={warning}
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {/* Document Breakdown */}
        {!hasErrors && previewData.documents && previewData.documents.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Documents to Import
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Document Name</TableCell>
                    <TableCell align="center">Evaluations</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.documents.map((doc, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{doc.document_name}</TableCell>
                      <TableCell align="center">{doc.evaluations_count}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={doc.status}
                          size="small"
                          color={doc.status === "valid" ? "success" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {!hasErrors && (
          <Button
            onClick={onConfirmImport}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Importing..." : "Import Truth Set"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}