"use client";

/**
 * ExecutionParameterDialog Component
 * 
 * Dialog for configuring optimization execution parameters before starting.
 * Currently supports max_trials (1-20), with future expansion for other params.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";

interface ExecutionParameterDialogProps {
  open: boolean;
  onClose: () => void;
  onStartExecution: (params: ExecutionParameters) => Promise<void>;
  executionNumber: number;
  loading?: boolean;
}

export interface ExecutionParameters {
  maxTrials: number;
  // Future parameters:
  // temperatureMin?: number;
  // temperatureMax?: number;
  // maxTokensMin?: number;
  // maxTokensMax?: number;
  // strategies?: string[];
}

export default function ExecutionParameterDialog({
  open,
  onClose,
  onStartExecution,
  executionNumber,
  loading = false,
}: ExecutionParameterDialogProps) {
  const [maxTrials, setMaxTrials] = useState<number>(7);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMaxTrials(7);
      setError(null);
    }
  }, [open]);

  const handleMaxTrialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setMaxTrials(value);
    
    // Validate range
    if (value < 1 || value > 20) {
      setError("Trials must be between 1 and 20");
    } else {
      setError(null);
    }
  };

  const handleStart = async () => {
    if (maxTrials < 1 || maxTrials > 20) {
      setError("Trials must be between 1 and 20");
      return;
    }

    try {
      await onStartExecution({ maxTrials });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start execution");
    }
  };

  const isValid = maxTrials >= 1 && maxTrials <= 20 && !error;

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Configure Optimization Execution
        {executionNumber && (
          <Typography variant="body2" color="text.secondary">
            Execution #{executionNumber}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          This execution will reuse the existing truth set configuration.
        </Alert>

        {/* Max Trials Parameter */}
        <TextField
          label="Number of Trials"
          type="number"
          value={maxTrials}
          onChange={handleMaxTrialsChange}
          error={!!error}
          helperText={
            error ||
            "Number of prompt variations to test (1-20). Recommended: 2-5 for testing, 7-10 for production."
          }
          inputProps={{ 
            min: 1, 
            max: 20,
            "aria-label": "Number of trials"
          }}
          fullWidth
          sx={{ mb: 2 }}
          disabled={loading}
        />

        {/* Trial Count Guidance */}
        <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="caption" display="block" gutterBottom>
            <strong>Guidance:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            • <strong>2-3 trials:</strong> Quick testing (1-2 min)
          </Typography>
          <Typography variant="caption" display="block">
            • <strong>5-7 trials:</strong> Balanced optimization (3-5 min)
          </Typography>
          <Typography variant="caption" display="block">
            • <strong>10+ trials:</strong> Thorough search (6-10 min)
          </Typography>
        </Box>

        {/* Advanced Parameters (Future) */}
        <Accordion disabled sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" color="text.secondary">
              Advanced Parameters (Coming Soon)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" color="text.secondary">
              Future options: temperature range, max tokens, prompt strategies
            </Typography>
          </AccordionDetails>
        </Accordion>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          disabled={!isValid || loading}
        >
          {loading ? "Starting..." : `Start Execution #${executionNumber}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}