/**
 * CreateEvaluationDialog Component
 *
 * Dialog for creating a new document evaluation.
 * Allows users to:
 * - Select or upload a document
 * - Choose document type
 * - Select evaluation criteria set
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from "@mui/material";
import {
  Description,
  Upload,
  Close,
} from "@mui/icons-material";
import type { KbDocument } from "@{{PROJECT_NAME}}/module-kb";
import type {
  EvalDocType,
  EvalCriteriaSet,
  CreateEvaluationInput,
} from "@{{PROJECT_NAME}}/module-eval";

export interface CreateEvaluationDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Create evaluation handler */
  onCreate: (input: CreateEvaluationInput) => Promise<void>;
  /** Available document types */
  docTypes: EvalDocType[];
  /** Available criteria sets by doc type */
  criteriaSets: EvalCriteriaSet[];
  /** Available KB documents */
  kbDocuments: KbDocument[];
  /** Upload document handler */
  onUploadDocument?: (file: File) => Promise<KbDocument>;
  /** Loading state */
  loading?: boolean;
}

type DocumentSource = "existing" | "upload";

export function CreateEvaluationDialog({
  open,
  onClose,
  onCreate,
  docTypes,
  criteriaSets,
  kbDocuments,
  onUploadDocument,
  loading = false,
}: CreateEvaluationDialogProps): React.ReactElement {
  const [name, setName] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [criteriaSetId, setCriteriaSetId] = useState("");
  const [documentSource, setDocumentSource] = useState<DocumentSource>("existing");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filter criteria sets by selected doc type
  const filteredCriteriaSets = useMemo(() => {
    if (!docTypeId) return [];
    return criteriaSets.filter((cs) => cs.docTypeId === docTypeId && cs.isActive);
  }, [docTypeId, criteriaSets]);

  // Get selected doc type name
  const selectedDocType = useMemo(() => {
    return docTypes.find((dt) => dt.id === docTypeId);
  }, [docTypeId, docTypes]);

  // Reset dependent fields when doc type changes
  const handleDocTypeChange = useCallback((newDocTypeId: string) => {
    setDocTypeId(newDocTypeId);
    setCriteriaSetId(""); // Reset criteria set when doc type changes
  }, []);

  // Handle file selection
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setError(null);
      // Auto-set name if empty
      if (!name) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setName(`${fileName} Evaluation`);
      }
    }
  }, [name]);

  // Remove uploaded file
  const handleRemoveFile = useCallback(() => {
    setUploadFile(null);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitting(true);

    try {
      // Validate inputs
      if (!name.trim()) {
        throw new Error("Evaluation name is required");
      }
      if (!docTypeId) {
        throw new Error("Please select a document type");
      }
      if (!criteriaSetId) {
        throw new Error("Please select a criteria set");
      }

      let docId: string;

      if (documentSource === "existing") {
        if (!selectedDocId) {
          throw new Error("Please select a document from knowledge base");
        }
        docId = selectedDocId;
      } else {
        // Upload new document
        if (!uploadFile) {
          throw new Error("Please select a file to upload");
        }
        if (!onUploadDocument) {
          throw new Error("Document upload is not available");
        }

        setUploading(true);
        const uploadedDoc = await onUploadDocument(uploadFile);
        setUploading(false);
        docId = uploadedDoc.id;
      }

      // Create evaluation
      await onCreate({
        name: name.trim(),
        docTypeId,
        criteriaSetId,
        docIds: [docId],
      });

      // Reset form
      setName("");
      setDocTypeId("");
      setCriteriaSetId("");
      setSelectedDocId("");
      setUploadFile(null);
      setDocumentSource("existing");

      onClose();
    } catch (err) {
      console.error("Failed to create evaluation:", err);
      setError(err instanceof Error ? err.message : "Failed to create evaluation");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }, [
    name,
    docTypeId,
    criteriaSetId,
    documentSource,
    selectedDocId,
    uploadFile,
    onCreate,
    onUploadDocument,
    onClose,
  ]);

  const isValid = useMemo(() => {
    if (!name.trim() || !docTypeId || !criteriaSetId) return false;
    if (documentSource === "existing" && !selectedDocId) return false;
    if (documentSource === "upload" && !uploadFile) return false;
    return true;
  }, [name, docTypeId, criteriaSetId, documentSource, selectedDocId, uploadFile]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Document Evaluation</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Evaluation Name */}
          <TextField
            label="Evaluation Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., CJIS Security Policy Review"
            fullWidth
            required
            helperText="Give this evaluation a descriptive name"
          />

          {/* Document Type Selection */}
          <FormControl fullWidth required>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={docTypeId}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              label="Document Type"
            >
              {docTypes.filter((dt) => dt.isActive).map((dt) => (
                <MenuItem key={dt.id} value={dt.id}>
                  {dt.name}
                  {dt.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {dt.description}
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Criteria Set Selection */}
          <FormControl fullWidth required disabled={!docTypeId}>
            <InputLabel>Evaluation Criteria Set</InputLabel>
            <Select
              value={criteriaSetId}
              onChange={(e) => setCriteriaSetId(e.target.value)}
              label="Evaluation Criteria Set"
            >
              {filteredCriteriaSets.length === 0 && docTypeId && (
                <MenuItem disabled>
                  No criteria sets available for {selectedDocType?.name}
                </MenuItem>
              )}
              {filteredCriteriaSets.map((cs) => (
                <MenuItem key={cs.id} value={cs.id}>
                  {cs.name} {cs.version && `(${cs.version})`}
                  {cs.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {cs.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block">
                    {cs.itemCount || 0} criteria items
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Document Source Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Document Source</FormLabel>
            <RadioGroup
              value={documentSource}
              onChange={(e) => setDocumentSource(e.target.value as DocumentSource)}
            >
              <FormControlLabel
                value="existing"
                control={<Radio aria-label="Select from Knowledge Base" />}
                label="Select from Knowledge Base"
              />
              <FormControlLabel
                value="upload"
                control={<Radio aria-label="Upload New Document" />}
                label="Upload New Document"
              />
            </RadioGroup>
          </FormControl>

          {/* Existing Document Selection */}
          {documentSource === "existing" && (
            <FormControl fullWidth required>
              <InputLabel>Select Document</InputLabel>
              <Select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                label="Select Document"
              >
                {kbDocuments.length === 0 && (
                  <MenuItem disabled>
                    No documents in knowledge base
                  </MenuItem>
                )}
                {kbDocuments.map((doc) => (
                  <MenuItem key={doc.id} value={doc.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Description fontSize="small" />
                      <Box>
                        <Typography variant="body2">{doc.filename || 'Unnamed Document'}</Typography>
                        {doc.fileSize && (
                          <Typography variant="caption" color="text.secondary">
                            {(doc.fileSize / 1024).toFixed(0)} KB
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Upload New Document */}
          {documentSource === "upload" && (
            <Box>
              {!uploadFile ? (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<Upload />}
                  fullWidth
                >
                  Choose File to Upload
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    aria-label="Upload document file"
                  />
                </Button>
              ) : (
                <List>
                  <ListItem
                    secondaryAction={
                      <IconButton edge="end" onClick={handleRemoveFile} aria-label="Remove file">
                        <Close />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText
                      primary={uploadFile.name}
                      secondary={`${(uploadFile.size / 1024).toFixed(0)} KB`}
                    />
                  </ListItem>
                </List>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Supported formats: PDF, DOC, DOCX, TXT
              </Typography>
            </Box>
          )}

          {uploading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Uploading and processing document...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting || uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || submitting || uploading || loading}
          startIcon={submitting ? <CircularProgress size={20} /> : undefined}
        >
          {submitting ? "Creating..." : "Create Evaluation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateEvaluationDialog;
