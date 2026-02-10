'use client';

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';

/**
 * Phase definition for the optimization pipeline
 */
interface OptimizationPhase {
  id: number;
  name: string;
  label: string;
  description: string;
}

/**
 * Phase data from database (eval_opt_run_phases table)
 */
interface PhaseData {
  phaseNumber: number;
  phaseName: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface OptimizationStepperProps {
  currentPhase: number;
  currentPhaseName: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  phases?: PhaseData[];
  progressMessage?: string;
}

/**
 * 5-Phase Optimization Pipeline
 */
const OPTIMIZATION_PHASES: OptimizationPhase[] = [
  {
    id: 1,
    name: 'domain_knowledge',
    label: 'Domain Knowledge Extraction',
    description: 'Extracting key concepts from context documents using RAG',
  },
  {
    id: 2,
    name: 'prompt_generation',
    label: 'Prompt Generation',
    description: 'Generating domain-aware prompts using meta-prompting',
  },
  {
    id: 3,
    name: 'variation_generation',
    label: 'Variation Generation',
    description: 'Creating multiple prompt variations for testing',
  },
  {
    id: 4,
    name: 'evaluation_loop',
    label: 'Evaluation Loop',
    description: 'Evaluating each variation against truth keys',
  },
  {
    id: 5,
    name: 'analysis',
    label: 'Analysis & Recommendations',
    description: 'Calculating accuracy metrics and generating recommendations',
  },
];

/**
 * Get step icon based on phase status
 */
function getStepIcon(
  phaseId: number,
  currentPhase: number,
  status: string,
  phaseData?: PhaseData
): React.ReactNode {
  // Use phase data status if available
  const phaseStatus = phaseData?.status;

  if (phaseStatus === 'failed' || (phaseId === currentPhase && status === 'failed')) {
    return <ErrorIcon color="error" />;
  }

  if (phaseStatus === 'complete' || phaseId < currentPhase) {
    return <CheckCircleIcon color="success" />;
  }

  if (phaseStatus === 'in_progress' || phaseId === currentPhase) {
    if (status === 'processing') {
      return <CircularProgress size={24} />;
    }
    return <HourglassEmptyIcon color="primary" />;
  }

  return <HourglassEmptyIcon color="disabled" />;
}

/**
 * Get step color based on phase status
 */
function getStepColor(
  phaseId: number,
  currentPhase: number,
  status: string,
  phaseData?: PhaseData
): 'error' | 'primary' | 'inherit' {
  const phaseStatus = phaseData?.status;

  if (phaseStatus === 'failed' || (phaseId === currentPhase && status === 'failed')) {
    return 'error';
  }

  if (phaseStatus === 'in_progress' || phaseId === currentPhase) {
    return 'primary';
  }

  return 'inherit';
}

/**
 * OptimizationStepper displays the 5-phase optimization pipeline progress
 * using MUI Stepper with live updates from the database.
 */
export default function OptimizationStepper({
  currentPhase,
  currentPhaseName,
  status,
  phases = [],
  progressMessage,
}: OptimizationStepperProps) {
  // Create a map of phase data by phaseNumber for quick lookup
  const phaseDataMap = React.useMemo(() => {
    const map = new Map<number, PhaseData>();
    phases.forEach((phase) => {
      map.set(phase.phaseNumber, phase);
    });
    return map;
  }, [phases]);

  // Determine active step (0-indexed for MUI Stepper)
  const activeStep = currentPhase - 1;

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* Overall status banner */}
      {status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Optimization Failed</strong>
            {progressMessage && `: ${progressMessage}`}
          </Typography>
        </Alert>
      )}

      {status === 'complete' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Optimization Complete!</strong> All variations evaluated successfully.
          </Typography>
        </Alert>
      )}

      {status === 'processing' && progressMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">{progressMessage}</Typography>
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {OPTIMIZATION_PHASES.map((phase) => {
          const phaseData = phaseDataMap.get(phase.id);
          const stepColor = getStepColor(phase.id, currentPhase, status, phaseData);

          return (
            <Step key={phase.id} completed={phaseData?.status === 'complete' || phase.id < currentPhase}>
              <StepLabel
                error={phaseData?.status === 'failed' || (phase.id === currentPhase && status === 'failed')}
                StepIconComponent={() => getStepIcon(phase.id, currentPhase, status, phaseData)}
              >
                <Typography variant="subtitle1" color={stepColor}>
                  {phase.label}
                </Typography>
              </StepLabel>

              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {phase.description}
                </Typography>

                {/* Phase-specific metadata */}
                {phaseData?.metadata && (
                  <Box sx={{ mt: 1 }}>
                    {/* Phase 2: Show variation count */}
                    {phase.id === 2 && phaseData.metadata.variation_count && (
                      <Typography variant="caption" color="text.secondary">
                        Generated {phaseData.metadata.variation_count} prompt variations
                      </Typography>
                    )}

                    {/* Phase 3: Show variation names */}
                    {phase.id === 3 && phaseData.metadata.variations && (
                      <Typography variant="caption" color="text.secondary">
                        Variations: {phaseData.metadata.variations.join(', ')}
                      </Typography>
                    )}

                    {/* Phase 4: Show evaluation progress */}
                    {phase.id === 4 && phaseData.metadata.progress && (
                      <Typography variant="caption" color="text.secondary">
                        {phaseData.metadata.progress.completed} of {phaseData.metadata.progress.total} variations completed
                      </Typography>
                    )}

                    {/* Phase 5: Show best accuracy */}
                    {phase.id === 5 && phaseData.metadata.best_accuracy !== undefined && (
                      <Typography variant="caption" color="text.secondary">
                        Best accuracy: {(phaseData.metadata.best_accuracy * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Error message */}
                {phaseData?.errorMessage && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="caption">{phaseData.errorMessage}</Typography>
                  </Alert>
                )}

                {/* Timestamps */}
                {phaseData?.startedAt && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {phaseData.completedAt ? (
                      <>
                        Completed in{' '}
                        {Math.round(
                          (new Date(phaseData.completedAt).getTime() - new Date(phaseData.startedAt).getTime()) / 1000
                        )}s
                      </>
                    ) : (
                      <>Started {new Date(phaseData.startedAt).toLocaleTimeString()}</>
                    )}
                  </Typography>
                )}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
