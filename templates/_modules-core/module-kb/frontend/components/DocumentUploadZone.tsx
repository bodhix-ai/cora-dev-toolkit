/**
 * DocumentUploadZone Component
 * 
 * Drag-and-drop file upload area with validation, progress tracking, and multi-file support.
 * Validates file types and size limits before upload.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Stack,
  Alert,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from '../types';

interface DocumentUploadZoneProps {
  /**
   * Callback when files are ready to upload
   * Should handle the actual upload logic and return Promise
   */
  onUpload: (files: File[]) => Promise<void>;
  
  /**
   * Maximum file size in bytes
   * @default 52428800 (50 MB)
   */
  maxSize?: number;
  
  /**
   * Accepted file types (MIME types)
   * @default SUPPORTED_MIME_TYPES
   */
  acceptedTypes?: string[];
  
  /**
   * Allow multiple file selection
   * @default true
   */
  multiple?: boolean;
  
  /**
   * Disable upload functionality
   */
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

/**
 * DocumentUploadZone provides drag-and-drop file upload with validation.
 */
export function DocumentUploadZone({
  onUpload,
  maxSize = MAX_FILE_SIZE,
  acceptedTypes = [...SUPPORTED_MIME_TYPES],
  multiple = true,
  disabled = false,
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file type and size
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      const allowedExtensions = acceptedTypes
        .map(type => {
          const ext = type.split('/')[1];
          return ext === 'vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'DOCX' : ext.toUpperCase();
        })
        .join(', ');
      return `File type not supported. Allowed: ${allowedExtensions}`;
    }

    // Check file size
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / 1024 / 1024);
      return `File too large. Maximum size is ${sizeMB} MB.`;
    }

    return null;
  };

  /**
   * Handle file selection
   */
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setValidationError(null);

    // Convert FileList to Array
    const fileArray = Array.from(files);

    // Validate all files
    const validationErrors = fileArray.map(file => validateFile(file)).filter(Boolean);
    if (validationErrors.length > 0) {
      setValidationError(validationErrors[0] || 'Invalid file');
      return;
    }

    // Initialize uploading state
    const initialUploadingFiles: UploadingFile[] = fileArray.map(file => ({
      file,
      status: 'uploading',
      progress: 0,
    }));
    setUploadingFiles(initialUploadingFiles);

    try {
      // Call upload handler
      await onUpload(fileArray);

      // Mark all as success
      setUploadingFiles(prev =>
        prev.map(uf => ({ ...uf, status: 'success', progress: 100 }))
      );

      // Clear success files after 2 seconds
      setTimeout(() => {
        setUploadingFiles([]);
      }, 2000);
    } catch (err) {
      // Mark all as error
      setUploadingFiles(prev =>
        prev.map(uf => ({
          ...uf,
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        }))
      );
    }
  }, [onUpload, maxSize, acceptedTypes]);

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled, handleFiles]);

  /**
   * Handle click to open file picker
   */
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  /**
   * Remove uploading file
   */
  const handleRemove = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  /**
   * Get accepted file extensions for display
   */
  const getAcceptedExtensions = (): string => {
    return 'PDF, DOCX, TXT, MD';
  };

  return (
    <Stack spacing={2}>
      {/* Upload Zone */}
      <Paper
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'divider',
          bgcolor: isDragOver ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: disabled ? 'divider' : 'primary.main',
            bgcolor: disabled ? 'background.paper' : 'action.hover',
          },
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
          aria-label="Upload documents"
        />

        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'action.active' }} />
          
          <Box textAlign="center">
            <Typography variant="body1" gutterBottom>
              {isDragOver ? 'Drop files here' : 'Drag & drop files here or click to upload'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getAcceptedExtensions()} (max {Math.round(maxSize / 1024 / 1024)} MB)
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            disabled={disabled}
          >
            Select Files
          </Button>
        </Box>
      </Paper>

      {/* Validation Error */}
      {validationError && (
        <Alert severity="error" onClose={() => setValidationError(null)}>
          {validationError}
        </Alert>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <Stack spacing={1}>
          {uploadingFiles.map((uploadingFile, index) => (
            <Paper key={index} sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                {/* Status Icon */}
                {uploadingFile.status === 'success' && (
                  <CheckCircleIcon color="success" />
                )}
                {uploadingFile.status === 'error' && (
                  <ErrorIcon color="error" />
                )}
                {uploadingFile.status === 'uploading' && (
                  <LinearProgress
                    variant="indeterminate"
                    sx={{ width: 24, height: 24, borderRadius: '50%' }}
                  />
                )}

                {/* File Info */}
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={500}>
                    {uploadingFile.file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(uploadingFile.file.size)}
                  </Typography>
                  {uploadingFile.error && (
                    <Typography variant="caption" color="error">
                      {uploadingFile.error}
                    </Typography>
                  )}
                </Box>

                {/* Remove Button */}
                {uploadingFile.status !== 'uploading' && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemove(index)}
                    aria-label="Remove file"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Progress Bar */}
              {uploadingFile.status === 'uploading' && (
                <LinearProgress sx={{ mt: 1 }} />
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
