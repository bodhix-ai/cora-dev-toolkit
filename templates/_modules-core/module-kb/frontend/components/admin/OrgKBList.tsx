/**
 * OrgKBList Component
 * 
 * Lists organization knowledge bases with CRUD actions.
 * Used by org admin pages.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Description as DocumentIcon,
  Category as ChunkIcon,
} from '@mui/icons-material';
import { KBFormDialog } from './KBFormDialog';
import type { KnowledgeBase, CreateKbInput, UpdateKbInput } from '../../types';

interface OrgKBListProps {
  /**
   * List of organization knowledge bases
   */
  kbs: KnowledgeBase[];
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * Organization ID
   */
  orgId: string;
  
  /**
   * Callback to create new KB
   */
  onCreate: (data: CreateKbInput) => Promise<void>;
  
  /**
   * Callback to update KB
   */
  onUpdate: (kbId: string, data: UpdateKbInput) => Promise<void>;
  
  /**
   * Callback to delete KB
   */
  onDelete: (kbId: string) => Promise<void>;
  
  /**
   * Callback when KB is selected for document management
   */
  onManageDocuments?: (kbId: string) => void;
}

/**
 * OrgKBList displays org KBs with create, edit, and delete actions.
 */
export function OrgKBList({
  kbs,
  loading = false,
  error = null,
  orgId,
  onCreate,
  onUpdate,
  onDelete,
  onManageDocuments,
}: OrgKBListProps) {
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | undefined>();
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  
  // Action state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  /**
   * Open create dialog
   */
  const handleCreate = () => {
    setEditingKb(undefined);
    setDialogOpen(true);
  };

  /**
   * Open edit dialog
   */
  const handleEdit = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    setDialogOpen(true);
    handleMenuClose();
  };

  /**
   * Handle delete
   */
  const handleDelete = async (kbId: string) => {
    handleMenuClose();
    setActionInProgress(kbId);
    try {
      await onDelete(kbId);
    } finally {
      setActionInProgress(null);
    }
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (data: CreateKbInput | UpdateKbInput) => {
    if (editingKb) {
      await onUpdate(editingKb.id, data as UpdateKbInput);
    } else {
      await onCreate(data as CreateKbInput);
    }
  };

  /**
   * Menu handlers
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, kbId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedKbId(kbId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedKbId(null);
  };

  /**
   * Format relative time
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

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

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Organization Knowledge Bases</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Create KB
        </Button>
      </Box>

      {/* Empty state */}
      {kbs.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No knowledge bases yet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Create a knowledge base to share documents across your organization
          </Typography>
        </Paper>
      )}

      {/* Table */}
      {kbs.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Documents</TableCell>
                <TableCell align="right">Chunks</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kbs.map((kb) => (
                <TableRow
                  key={kb.id}
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  {/* Name */}
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {kb.name}
                      </Typography>
                      {kb.description && (
                        <Typography variant="caption" color="text.secondary">
                          {kb.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip
                      label={kb.isEnabled ? 'Enabled' : 'Disabled'}
                      color={kb.isEnabled ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>

                  {/* Documents */}
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                      <DocumentIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {kb.documentCount || 0}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Chunks */}
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                      <ChunkIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {kb.chunkCount || 0}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Created */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(kb.createdAt)}
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    {actionInProgress === kb.id ? (
                      <CircularProgress size={24} />
                    ) : (
                      <>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(kb)}
                            aria-label="Edit"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, kb.id)}
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
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && selectedKbId !== null}
        onClose={handleMenuClose}
      >
        {onManageDocuments && (
          <MenuItem
            onClick={() => {
              selectedKbId && onManageDocuments(selectedKbId);
              handleMenuClose();
            }}
          >
            <DocumentIcon fontSize="small" sx={{ mr: 1 }} />
            Manage Documents
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const kb = kbs.find(k => k.id === selectedKbId);
            if (kb) handleEdit(kb);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => selectedKbId && handleDelete(selectedKbId)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Form Dialog */}
      <KBFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        kb={editingKb}
        mode="org"
        orgId={orgId}
      />
    </Stack>
  );
}
