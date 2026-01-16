/**
 * SysKBList Component
 * 
 * Lists system (global) knowledge bases with CRUD actions and org associations.
 * Used by platform admin pages.
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
  Business as OrgIcon,
  Public as GlobalIcon,
} from '@mui/icons-material';
import { KBFormDialog } from './KBFormDialog';
import type { KnowledgeBase, CreateKbInput, UpdateKbInput } from '../../types';

interface SysKBListProps {
  /**
   * List of system knowledge bases
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
  
  /**
   * Callback to manage org associations
   */
  onManageOrgs?: (kbId: string) => void;
  
  /**
   * Number of orgs associated with each KB (map of kbId -> count)
   */
  orgCounts?: Record<string, number>;
}

/**
 * SysKBList displays system KBs with create, edit, delete, and org association actions.
 */
export function SysKBList({
  kbs,
  loading = false,
  error = null,
  onCreate,
  onUpdate,
  onDelete,
  onManageDocuments,
  onManageOrgs,
  orgCounts = {},
}: SysKBListProps) {
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
   * Format date
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
        <Box display="flex" alignItems="center" gap={1}>
          <GlobalIcon color="primary" />
          <Typography variant="h6">System Knowledge Bases</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Create System KB
        </Button>
      </Box>

      {/* Info */}
      <Alert severity="info" icon={<GlobalIcon />}>
        System knowledge bases can be shared with organizations across the platform.
        Organizations must enable them before their members can access.
      </Alert>

      {/* Empty state */}
      {kbs.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <GlobalIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No system knowledge bases yet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Create a system KB to share knowledge across all organizations
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
                <TableCell align="right">Orgs</TableCell>
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

                  {/* Orgs */}
                  <TableCell align="right">
                    <Tooltip title="Organizations with access">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                        <OrgIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {orgCounts[kb.id] || 0}
                        </Typography>
                      </Box>
                    </Tooltip>
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
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, kb.id)}
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
        {onManageOrgs && (
          <MenuItem
            onClick={() => {
              selectedKbId && onManageOrgs(selectedKbId);
              handleMenuClose();
            }}
          >
            <OrgIcon fontSize="small" sx={{ mr: 1 }} />
            Manage Organizations
          </MenuItem>
        )}
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
        mode="sys"
      />
    </Stack>
  );
}
