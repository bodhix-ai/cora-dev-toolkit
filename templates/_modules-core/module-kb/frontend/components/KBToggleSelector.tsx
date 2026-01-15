/**
 * KBToggleSelector Component
 * 
 * Displays and toggles available knowledge bases grouped by source (workspace, chat, org, global).
 * Shows document counts and handles optimistic UI updates.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Stack,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Business as BusinessIcon,
  Public as PublicIcon,
  Chat as ChatIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { AvailableKb } from '../types';

interface KBToggleSelectorProps {
  /**
   * Available KBs grouped by scope
   */
  availableKbs: {
    workspaceKb?: AvailableKb;
    chatKb?: AvailableKb;
    orgKbs: AvailableKb[];
    globalKbs: AvailableKb[];
  };
  
  /**
   * Callback when KB toggle state changes
   * Should handle API call and return Promise
   */
  onToggle: (kbId: string, enabled: boolean) => Promise<void>;
  
  /**
   * Disable all toggles
   */
  disabled?: boolean;
  
  /**
   * Show loading state for entire selector
   */
  loading?: boolean;
  
  /**
   * Error message to display
   */
  error?: string | null;
}

/**
 * KBToggleSelector displays available knowledge bases with toggle switches.
 * Handles optimistic UI updates with automatic rollback on error.
 */
export function KBToggleSelector({
  availableKbs,
  onToggle,
  disabled = false,
  loading = false,
  error = null,
}: KBToggleSelectorProps) {
  // Track which KB is currently being toggled
  const [togglingKbId, setTogglingKbId] = useState<string | null>(null);
  
  // Track optimistic state for toggles
  const [optimisticState, setOptimisticState] = useState<Record<string, boolean>>({});

  /**
   * Handle toggle with optimistic update
   */
  const handleToggle = async (kbId: string, currentState: boolean) => {
    const newState = !currentState;
    
    // Optimistic update
    setOptimisticState(prev => ({ ...prev, [kbId]: newState }));
    setTogglingKbId(kbId);
    
    try {
      await onToggle(kbId, newState);
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticState(prev => ({ ...prev, [kbId]: currentState }));
      console.error('Failed to toggle KB:', err);
    } finally {
      setTogglingKbId(null);
    }
  };

  /**
   * Get current toggle state (optimistic or actual)
   */
  const getToggleState = (availableKb: AvailableKb): boolean => {
    return availableKb.kb.id in optimisticState 
      ? optimisticState[availableKb.kb.id] 
      : availableKb.isEnabled;
  };

  /**
   * Render individual KB toggle
   */
  const renderKBToggle = (availableKb: AvailableKb) => {
    const { kb } = availableKb;
    const isToggling = togglingKbId === kb.id;
    const isEnabled = getToggleState(availableKb);
    const isDisabled = disabled || !kb.isEnabled || isToggling;
    const docCount = kb.documentCount || 0;

    const toggle = (
      <FormControlLabel
        control={
          <Switch
            checked={isEnabled}
            onChange={() => handleToggle(kb.id, isEnabled)}
            disabled={isDisabled}
            size="small"
            inputProps={{ 'aria-label': `Enable ${kb.name} knowledge base` }}
          />
        }
        label={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2">
              {kb.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({docCount} {docCount === 1 ? 'doc' : 'docs'})
            </Typography>
            {isToggling && (
              <CircularProgress size={16} />
            )}
          </Box>
        }
      />
    );

    // Wrap in tooltip if KB is disabled at source
    if (!kb.isEnabled) {
      return (
        <Tooltip
          key={kb.id}
          title="This knowledge base is currently unavailable. Contact your administrator."
          placement="right"
        >
          <span>{toggle}</span>
        </Tooltip>
      );
    }

    return <Box key={kb.id}>{toggle}</Box>;
  };

  /**
   * Render KB group section
   */
  const renderKBGroup = (
    title: string,
    icon: React.ReactNode,
    kbs: AvailableKb[],
    showDivider: boolean = true
  ) => {
    if (kbs.length === 0) return null;

    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {icon}
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Stack spacing={0.5} ml={4}>
          {kbs.map(renderKBToggle)}
        </Stack>
        {showDivider && <Divider sx={{ my: 2 }} />}
      </Box>
    );
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

  // Check if any KBs available
  const hasAnyKbs = 
    availableKbs.workspaceKb ||
    availableKbs.chatKb ||
    availableKbs.orgKbs.length > 0 ||
    availableKbs.globalKbs.length > 0;

  // Empty state
  if (!hasAnyKbs) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <InfoIcon color="action" />
          <Box>
            <Typography variant="body2" color="text.secondary">
              No knowledge bases available yet.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Upload documents to create your workspace knowledge base, or ask your administrator to enable organizational knowledge bases.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="h6">
          KB Context for This Workspace
        </Typography>
        <Tooltip title="Enable knowledge bases to provide context for AI responses. Documents from enabled KBs will be searched when generating responses.">
          <InfoIcon fontSize="small" color="action" />
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={3}>
        Enable knowledge bases to provide context for AI responses.
      </Typography>

      <Stack spacing={2}>
        {/* Workspace KB */}
        {availableKbs.workspaceKb && renderKBGroup(
          'Workspace',
          <FolderIcon fontSize="small" color="action" />,
          [availableKbs.workspaceKb],
          !!(availableKbs.chatKb || availableKbs.orgKbs.length > 0 || availableKbs.globalKbs.length > 0)
        )}

        {/* Chat KB */}
        {availableKbs.chatKb && renderKBGroup(
          'Chat',
          <ChatIcon fontSize="small" color="action" />,
          [availableKbs.chatKb],
          !!(availableKbs.orgKbs.length > 0 || availableKbs.globalKbs.length > 0)
        )}

        {/* Organization KBs */}
        {renderKBGroup(
          'Organization',
          <BusinessIcon fontSize="small" color="action" />,
          availableKbs.orgKbs,
          availableKbs.globalKbs.length > 0
        )}

        {/* Global KBs */}
        {renderKBGroup(
          'Global',
          <PublicIcon fontSize="small" color="action" />,
          availableKbs.globalKbs,
          false
        )}
      </Stack>
    </Paper>
  );
}
