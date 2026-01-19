/**
 * DocumentTable Component
 * 
 * Displays documents with status, metadata, and actions (download, delete, retry).
 * Supports pagination and filtering by status.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { KbDocument, DocumentStatus } from '../types';

interface DocumentTableProps {
  /**
   * List of documents to display
   */
  documents: KbDocument[];
  
  /**
   * Callback to download document (gets presigned URL and may return it)
   */
  onDownload: (documentId: string) => Promise<string | void>;
  
  /**
   * Callback to delete document
   */
  onDelete: (documentId: string) => Promise<void>;
  
  /**
   * Callback to retry failed document processing
   */
  onRetry?: (documentId: string) => Promise<void>;
  
  /**
   * Show loading state
   */
  loading?: boolean;
  
  /**
   * User can delete any document (owner/admin permission)
   * @default false - user can only delete own documents
   */
  canDeleteAll?: boolean;
  
  /**
   * Current user ID (for ownership check)
   */
  currentUserId?: string;
  
  /**
   * Error message
   */
  error?: string | null;
}

/**
 * DocumentTable displays documents with actions and status badges.
 */
export function DocumentTable({
  documents,
  onDownload,
  onDelete,
  onRetry,
  loading = false,
  canDeleteAll = false,
  currentUserId,
  error = null,
}: DocumentTableProps) {
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  /**
   * Handle action menu open
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, docId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocId(docId);
  };

  /**
   * Handle action menu close
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocId(null);
  };

  /**
   * Handle document download
   */
  const handleDownload = async (docId: string) => {
    setActionInProgress(docId);
    handleMenuClose();
    try {
      await onDownload(docId);
    } finally {
      setActionInProgress(null);
    }
  };

  /**
   * Handle document delete with confirmation
   */
  const handleDelete = async (docId: string) => {
    handleMenuClose();
    // In production, show confirmation dialog
    setActionInProgress(docId);
    try {
      await onDelete(docId);
    } finally {
      setActionInProgress(null);
    }
  };

  /**
   * Handle retry failed document
   */
  const handleRetry = async (docId: string) => {
    if (!onRetry) return;
    handleMenuClose();
    setActionInProgress(docId);
    try {
      await onRetry(docId);
    } finally {
      setActionInProgress(null);
    }
  };

  /**
   * Check if user can delete this document
   */
  const canDelete = (doc: KbDocument): boolean => {
    if (canDeleteAll) return true;
    if (currentUserId && doc.createdBy === currentUserId) return true;
    return false;
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
   * Format relative time
   */
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Get file icon based on MIME type
   */
  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon />;
    if (mimeType.includes('pdf')) return <PdfIcon color="error" />;
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <DescriptionIcon color="primary" />;
    }
    if (mimeType.includes('text') || mimeType.includes('markdown')) {
      return <DescriptionIcon color="action" />;
    }
    return <FileIcon />;
  };

  /**
   * Filter documents by status
   */
  const filteredDocuments = statusFilter === 'all'
    ? documents
    : documents.filter(doc => doc.status === statusFilter);

  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <FileIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          No documents yet
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Upload files to create your knowledge base
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Filter */}
      <Box display="flex" justifyContent="flex-end">
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by status"
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="indexed">Indexed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocuments.map((doc) => (
              <TableRow
                key={doc.id}
                sx={{ 
                  opacity: doc.isDeleted ? 0.5 : 1,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                {/* Name */}
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getFileIcon(doc.mimeType)}
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                      {doc.filename}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Size */}
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(doc.fileSize)}
                  </Typography>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <DocumentStatusBadge
                    status={doc.status}
                    errorMessage={doc.errorMessage || undefined}
                  />
                </TableCell>

                {/* Uploaded */}
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatRelativeTime(doc.createdAt)}
                  </Typography>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  {actionInProgress === doc.id ? (
                    <CircularProgress size={24} />
                  ) : (
                    <>
                      {/* Quick actions for common operations */}
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(doc.id)}
                          disabled={doc.status !== 'indexed'}
                          aria-label="Download"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* More actions menu */}
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, doc.id)}
                        aria-label="More actions"
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && selectedDocId !== null}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => selectedDocId && handleDownload(selectedDocId)}
          disabled={
            !selectedDocId ||
            documents.find(d => d.id === selectedDocId)?.status !== 'indexed'
          }
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>

        {onRetry && (
          <MenuItem
            onClick={() => selectedDocId && handleRetry(selectedDocId)}
            disabled={
              !selectedDocId ||
              documents.find(d => d.id === selectedDocId)?.status !== 'failed'
            }
          >
            <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
            Retry Processing
          </MenuItem>
        )}

        <MenuItem
          onClick={() => selectedDocId && handleDelete(selectedDocId)}
          disabled={
            !selectedDocId ||
            !canDelete(documents.find(d => d.id === selectedDocId)!)
          }
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Filtered empty state */}
      {filteredDocuments.length === 0 && documents.length > 0 && (
        <Alert severity="info">
          No documents with &quot;{statusFilter}&quot; status.
        </Alert>
      )}
    </Stack>
  );
}
