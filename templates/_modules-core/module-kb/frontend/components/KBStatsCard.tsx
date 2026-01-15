/**
 * KBStatsCard Component
 * 
 * Displays knowledge base statistics including document count, chunk count,
 * storage usage, and processing status.
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Category as ChunkIcon,
  Storage as StorageIcon,
  Sync as ProcessingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface KBStatsCardProps {
  /**
   * Knowledge base statistics
   */
  stats: {
    /** Total number of documents */
    documentCount: number;
    /** Total number of indexed chunks */
    chunkCount: number;
    /** Total storage size in bytes */
    totalSize: number;
    /** Number of documents currently processing */
    processingCount?: number;
    /** Number of failed documents */
    failedCount?: number;
  };
  
  /**
   * Show loading state
   */
  loading?: boolean;
  
  /**
   * Optional title override
   * @default 'Knowledge Base Stats'
   */
  title?: string;
  
  /**
   * Compact mode (horizontal layout)
   * @default false
   */
  compact?: boolean;
}

/**
 * Format bytes to human-readable size
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * KBStatsCard displays KB statistics in a card format.
 */
export function KBStatsCard({
  stats,
  loading = false,
  title = 'Knowledge Base Stats',
  compact = false,
}: KBStatsCardProps) {
  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={100}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  /**
   * Stat item component
   */
  const StatItem = ({
    icon,
    label,
    value,
    color = 'text.primary',
    tooltip,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color?: string;
    tooltip?: string;
  }) => {
    const content = (
      <Box display="flex" alignItems="center" gap={1}>
        <Box color="action.active">{icon}</Box>
        <Box>
          <Typography variant="body2" color="text.secondary" fontSize={12}>
            {label}
          </Typography>
          <Typography variant="body1" fontWeight={500} color={color}>
            {value}
          </Typography>
        </Box>
      </Box>
    );

    if (tooltip) {
      return (
        <Tooltip title={tooltip}>
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  // Compact layout (horizontal)
  if (compact) {
    return (
      <Paper sx={{ p: 2 }}>
        <Stack
          direction="row"
          spacing={3}
          divider={<Divider orientation="vertical" flexItem />}
          alignItems="center"
          justifyContent="space-around"
        >
          <StatItem
            icon={<DocumentIcon fontSize="small" />}
            label="Documents"
            value={stats.documentCount}
          />
          <StatItem
            icon={<ChunkIcon fontSize="small" />}
            label="Chunks"
            value={stats.chunkCount}
          />
          <StatItem
            icon={<StorageIcon fontSize="small" />}
            label="Storage"
            value={formatSize(stats.totalSize)}
          />
          {(stats.processingCount ?? 0) > 0 && (
            <StatItem
              icon={<ProcessingIcon fontSize="small" />}
              label="Processing"
              value={stats.processingCount || 0}
              color="info.main"
              tooltip="Documents currently being indexed"
            />
          )}
          {(stats.failedCount ?? 0) > 0 && (
            <StatItem
              icon={<WarningIcon fontSize="small" />}
              label="Failed"
              value={stats.failedCount || 0}
              color="error.main"
              tooltip="Documents that failed processing"
            />
          )}
        </Stack>
      </Paper>
    );
  }

  // Standard layout (vertical)
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        {title}
      </Typography>
      
      <Stack spacing={2}>
        <StatItem
          icon={<DocumentIcon />}
          label="Documents"
          value={stats.documentCount}
          tooltip="Total number of uploaded documents"
        />
        
        <Divider />
        
        <StatItem
          icon={<ChunkIcon />}
          label="Indexed Chunks"
          value={stats.chunkCount}
          tooltip="Text chunks available for RAG search"
        />
        
        <Divider />
        
        <StatItem
          icon={<StorageIcon />}
          label="Storage Used"
          value={formatSize(stats.totalSize)}
          tooltip="Total document storage usage"
        />
        
        {(stats.processingCount ?? 0) > 0 && (
          <>
            <Divider />
            <StatItem
              icon={<ProcessingIcon />}
              label="Processing"
              value={stats.processingCount || 0}
              color="info.main"
              tooltip="Documents currently being indexed"
            />
          </>
        )}
        
        {(stats.failedCount ?? 0) > 0 && (
          <>
            <Divider />
            <StatItem
              icon={<WarningIcon />}
              label="Failed"
              value={stats.failedCount || 0}
              color="error.main"
              tooltip="Documents that failed processing - retry or delete"
            />
          </>
        )}
      </Stack>
    </Paper>
  );
}
