/**
 * DocumentStatusBadge Component
 * 
 * Displays document processing status with appropriate styling and tooltips.
 * Shows error messages for failed documents.
 */

import React from 'react';
import { Chip, Tooltip, CircularProgress } from '@mui/material';
import {
  Schedule as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as XCircleIcon,
  Autorenew as Loader2Icon,
} from '@mui/icons-material';
import type { DocumentStatus } from '../types';

interface DocumentStatusBadgeProps {
  /**
   * Document processing status
   */
  status: DocumentStatus;
  
  /**
   * Error message (shown for 'failed' status)
   */
  errorMessage?: string;
  
  /**
   * Size variant
   * @default 'small'
   */
  size?: 'small' | 'medium';
}

/**
 * Status configuration mapping
 */
const STATUS_CONFIG: Record<
  DocumentStatus,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    Icon: typeof ClockIcon;
    animate?: boolean;
  }
> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    Icon: ClockIcon,
  },
  processing: {
    label: 'Processing',
    color: 'info',
    Icon: Loader2Icon,
    animate: true,
  },
  indexed: {
    label: 'Indexed',
    color: 'success',
    Icon: CheckCircleIcon,
  },
  failed: {
    label: 'Failed',
    color: 'error',
    Icon: XCircleIcon,
  },
};

/**
 * DocumentStatusBadge displays document processing status as a styled chip.
 */
export function DocumentStatusBadge({
  status,
  errorMessage,
  size = 'small',
}: DocumentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const { label, color, Icon, animate } = config;

  const badge = (
    <Chip
      icon={
        <Icon
          sx={{
            animation: animate ? 'spin 1s linear infinite' : undefined,
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      }
      label={label}
      color={color}
      size={size}
      variant="outlined"
    />
  );

  // Show tooltip with error message for failed status
  if (status === 'failed' && errorMessage) {
    return (
      <Tooltip title={errorMessage} placement="top">
        {badge}
      </Tooltip>
    );
  }

  // Show tooltip with status description for other statuses
  const tooltipTitles: Record<DocumentStatus, string> = {
    pending: 'Document is queued for processing',
    processing: 'Document is being parsed and indexed',
    indexed: 'Document is indexed and ready for search',
    failed: errorMessage || 'Document processing failed',
  };

  return (
    <Tooltip title={tooltipTitles[status]} placement="top">
      {badge}
    </Tooltip>
  );
}
