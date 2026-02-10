'use client';

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

/**
 * Variation progress data from database (eval_opt_variation_progress table)
 */
interface VariationProgress {
  variationName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  criteriaTotal: number;
  criteriaCompleted: number;
  accuracy?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface VariationProgressTableProps {
  variations: VariationProgress[];
  loading?: boolean;
}

/**
 * Get status chip configuration based on variation status
 */
function getStatusChip(status: string): {
  label: string;
  color: 'default' | 'primary' | 'success' | 'error';
  icon: React.ReactElement;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        color: 'default',
        icon: <HourglassEmptyIcon />,
      };
    case 'running':
      return {
        label: 'Running',
        color: 'primary',
        icon: <PlayArrowIcon />,
      };
    case 'complete':
      return {
        label: 'Complete',
        color: 'success',
        icon: <CheckCircleIcon />,
      };
    case 'error':
      return {
        label: 'Error',
        color: 'error',
        icon: <ErrorIcon />,
      };
    default:
      return {
        label: 'Unknown',
        color: 'default',
        icon: <HourglassEmptyIcon />,
      };
  }
}

/**
 * Format accuracy as percentage with color coding
 */
function formatAccuracy(accuracy?: number): { text: string; color: string } {
  if (accuracy === undefined || accuracy === null) {
    return { text: '-', color: 'text.secondary' };
  }

  const percentage = accuracy * 100;

  // Color coding based on accuracy
  let color = 'error.main';
  if (percentage >= 90) {
    color = 'success.main';
  } else if (percentage >= 70) {
    color = 'warning.main';
  }

  return {
    text: `${percentage.toFixed(1)}%`,
    color,
  };
}

/**
 * VariationProgressTable displays live progress for each prompt variation
 * during the Phase 4 evaluation loop.
 */
export default function VariationProgressTable({
  variations,
  loading = false,
}: VariationProgressTableProps) {
  // Sort variations: running first, then by accuracy (descending), then alphabetically
  const sortedVariations = React.useMemo(() => {
    return [...variations].sort((a, b) => {
      // Running variations first
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;

      // Then by accuracy (descending)
      if (a.accuracy !== undefined && b.accuracy !== undefined) {
        return b.accuracy - a.accuracy;
      }
      if (a.accuracy !== undefined) return -1;
      if (b.accuracy !== undefined) return 1;

      // Finally alphabetically
      return a.variationName.localeCompare(b.variationName);
    });
  }, [variations]);

  if (variations.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No variations to display yet. Waiting for variation generation phase to complete...
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width="25%">
              <Typography variant="subtitle2">Variation Name</Typography>
            </TableCell>
            <TableCell width="35%">
              <Typography variant="subtitle2">Progress</Typography>
            </TableCell>
            <TableCell width="15%" align="center">
              <Typography variant="subtitle2">Status</Typography>
            </TableCell>
            <TableCell width="15%" align="center">
              <Typography variant="subtitle2">Accuracy</Typography>
            </TableCell>
            <TableCell width="10%" align="center">
              <Typography variant="subtitle2">Duration</Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedVariations.map((variation) => {
            const statusChip = getStatusChip(variation.status);
            const accuracy = formatAccuracy(variation.accuracy);
            const progress = variation.criteriaTotal > 0
              ? (variation.criteriaCompleted / variation.criteriaTotal) * 100
              : 0;

            // Calculate duration
            let duration = '-';
            if (variation.startedAt) {
              const endTime = variation.completedAt
                ? new Date(variation.completedAt)
                : new Date();
              const durationSeconds = Math.round(
                (endTime.getTime() - new Date(variation.startedAt).getTime()) / 1000
              );
              duration = `${durationSeconds}s`;
            }

            return (
              <TableRow
                key={variation.variationName}
                hover
                sx={{
                  backgroundColor:
                    variation.status === 'running' ? 'action.hover' : 'inherit',
                }}
              >
                {/* Variation Name */}
                <TableCell>
                  <Tooltip title={variation.variationName} placement="top-start">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: variation.status === 'running' ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {variation.variationName}
                    </Typography>
                  </Tooltip>
                </TableCell>

                {/* Progress Bar */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        color={
                          variation.status === 'error'
                            ? 'error'
                            : variation.status === 'complete'
                            ? 'success'
                            : 'primary'
                        }
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                      {variation.criteriaCompleted}/{variation.criteriaTotal}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Status */}
                <TableCell align="center">
                  {variation.errorMessage ? (
                    <Tooltip title={variation.errorMessage} placement="top">
                      <Chip
                        icon={statusChip.icon}
                        label={statusChip.label}
                        color={statusChip.color}
                        size="small"
                      />
                    </Tooltip>
                  ) : (
                    <Chip
                      icon={statusChip.icon}
                      label={statusChip.label}
                      color={statusChip.color}
                      size="small"
                    />
                  )}
                </TableCell>

                {/* Accuracy */}
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    sx={{
                      color: accuracy.color,
                      fontWeight: variation.status === 'complete' ? 600 : 400,
                    }}
                  >
                    {accuracy.text}
                  </Typography>
                </TableCell>

                {/* Duration */}
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary">
                    {duration}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Loading overlay */}
      {loading && (
        <Box sx={{ position: 'relative', mt: -0.5 }}>
          <LinearProgress />
        </Box>
      )}
    </TableContainer>
  );
}
