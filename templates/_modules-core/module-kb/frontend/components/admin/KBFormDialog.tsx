/**
 * KBFormDialog Component
 * 
 * Dialog for creating and editing knowledge bases.
 * Used by both org admin and platform admin pages.
 */

import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Stack,
  CircularProgress,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import type { KnowledgeBase, CreateKbInput, UpdateKbInput, KbConfig } from '../../types';
import { DEFAULT_KB_CONFIG } from '../../types';

interface KBFormDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * Callback when form is submitted
   */
  onSubmit: (data: CreateKbInput | UpdateKbInput) => Promise<void>;
  
  /**
   * Knowledge base to edit (undefined = create mode)
   */
  kb?: KnowledgeBase;
  
  /**
   * Mode: 'org' for org KBs, 'sys' for system/global KBs
   */
  mode: 'org' | 'sys';
  
  /**
   * Organization ID (required for org mode)
   */
  orgId?: string;
}

/**
 * KBFormDialog provides a form for creating or editing knowledge bases.
 */
export function KBFormDialog({
  open,
  onClose,
  onSubmit,
  kb,
  mode,
  orgId,
}: KBFormDialogProps) {
  const isEditMode = Boolean(kb);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whoCanUpload, setWhoCanUpload] = useState<KbConfig['whoCanUpload']>('admin');
  const [autoIndex, setAutoIndex] = useState(true);
  const [chunkSize, setChunkSize] = useState(DEFAULT_KB_CONFIG.chunkSize);
  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_KB_CONFIG.chunkOverlap);
  const [maxDocuments, setMaxDocuments] = useState(DEFAULT_KB_CONFIG.maxDocuments);
  const [isEnabled, setIsEnabled] = useState(true);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Reset form when dialog opens or KB changes
   */
  useEffect(() => {
    if (open) {
      if (kb) {
        // Edit mode - populate from existing KB
        setName(kb.name);
        setDescription(kb.description || '');
        setWhoCanUpload(kb.config.whoCanUpload);
        setAutoIndex(kb.config.autoIndex);
        setChunkSize(kb.config.chunkSize);
        setChunkOverlap(kb.config.chunkOverlap);
        setMaxDocuments(kb.config.maxDocuments);
        setIsEnabled(kb.isEnabled);
      } else {
        // Create mode - reset to defaults
        setName('');
        setDescription('');
        setWhoCanUpload('admin');
        setAutoIndex(true);
        setChunkSize(DEFAULT_KB_CONFIG.chunkSize);
        setChunkOverlap(DEFAULT_KB_CONFIG.chunkOverlap);
        setMaxDocuments(DEFAULT_KB_CONFIG.maxDocuments);
        setIsEnabled(true);
      }
      setError(null);
      setShowAdvanced(false);
    }
  }, [open, kb]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (mode === 'org' && !orgId && !isEditMode) {
      setError('Organization ID is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const config: Partial<KbConfig> = {
        whoCanUpload,
        autoIndex,
        chunkSize,
        chunkOverlap,
        maxDocuments,
      };
      
      if (isEditMode) {
        // Update existing KB
        const updateData: UpdateKbInput = {
          name: name.trim(),
          description: description.trim() || undefined,
          config,
          isEnabled,
        };
        await onSubmit(updateData);
      } else {
        // Create new KB
        const createData: CreateKbInput = {
          name: name.trim(),
          description: description.trim() || undefined,
          scope: mode === 'sys' ? 'sys' : 'org',
          orgId: mode === 'org' ? orgId : undefined,
          config,
        };
        await onSubmit(createData);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save knowledge base');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditMode ? 'Edit Knowledge Base' : 'Create Knowledge Base'}
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            {/* Basic Info */}
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
              disabled={loading}
              helperText="A descriptive name for this knowledge base"
            />
            
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
              disabled={loading}
              helperText="Optional description of the KB's purpose"
            />
            
            {/* Upload Permission */}
            <FormControl fullWidth>
              <InputLabel>Who can upload documents</InputLabel>
              <Select
                value={whoCanUpload}
                label="Who can upload documents"
                onChange={(e) => setWhoCanUpload(e.target.value as KbConfig['whoCanUpload'])}
                disabled={loading}
              >
                <MenuItem value="admin">Admins only</MenuItem>
                <MenuItem value="all_members">All members</MenuItem>
              </Select>
            </FormControl>
            
            {/* Auto Index */}
            <FormControlLabel
              control={
                <Switch
                  checked={autoIndex}
                  onChange={(e) => setAutoIndex(e.target.checked)}
                  disabled={loading}
                  inputProps={{ 'aria-label': 'Auto-index uploaded documents' }}
                />
              }
              label="Auto-index uploaded documents"
            />
            
            {/* Enabled (edit mode only) */}
            {isEditMode && (
              <FormControlLabel
                control={
                  <Switch
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    disabled={loading}
                    inputProps={{ 'aria-label': 'Knowledge base enabled' }}
                  />
                }
                label="Knowledge base enabled"
              />
            )}
            
            {/* Advanced Settings Toggle */}
            <Button
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ alignSelf: 'flex-start' }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>
            
            {/* Advanced Settings */}
            {showAdvanced && (
              <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Chunking Configuration
                  </Typography>
                  
                  <TextField
                    label="Chunk Size (characters)"
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    inputProps={{ min: 100, max: 10000 }}
                    disabled={loading}
                    helperText="Default: 1000. Size of text chunks for embedding"
                  />
                  
                  <TextField
                    label="Chunk Overlap (characters)"
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    inputProps={{ min: 0, max: 1000 }}
                    disabled={loading}
                    helperText="Default: 200. Overlap between consecutive chunks"
                  />
                  
                  <TextField
                    label="Max Documents"
                    type="number"
                    value={maxDocuments}
                    onChange={(e) => setMaxDocuments(Number(e.target.value))}
                    inputProps={{ min: 1, max: 10000 }}
                    disabled={loading}
                    helperText="Maximum documents allowed in this KB"
                  />
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {isEditMode ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
