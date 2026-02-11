"use client";

/**
 * ExecutionCard Component
 * 
 * Displays a single execution with collapsible details.
 * Shows progress when running, metrics when completed.
 */

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Button,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import OptimizationStepper from "./OptimizationStepper";
import VariationProgressTable from "./VariationProgressTable";

// ============================================================================
// TYPES
// ============================================================================

interface ExecutionCardProps {
  execution: {
    id: string;
    executionNumber: number;
    status: "pending" | "running" | "completed" | "failed";
    maxTrials: number;
    overallAccuracy?: number;
    bestVariation?: string;
    startedAt?: string;
    completedAt?: string;
    durationSeconds?: number;
    currentPhase?: number;
    currentPhaseName?: string;
    progress?: number;
    progressMessage?: string;
  };
  phases?: any[];
  variations?: any[];
  defaultExpanded?: boolean;
  onViewResults?: (executionId: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: ExecutionCardProps["execution"]["status"]) {
  switch (status) {
    case "completed":
      return "success";
    case "running":
      return "info";
    case "failed":
      return "error";
    default:
      return "default";
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExecutionCard({
  execution,
  phases = [],
  variations = [],
  defaultExpanded = false,
  onViewResults,
}: ExecutionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Auto-expand if running
  const isExpanded = execution.status === "running" ? true : expanded;

  const handleToggle = () => {
    // Can't collapse running execution
    if (execution.status === "running") return;
    setExpanded(!expanded);
  };

  const handleViewResults = () => {
    if (onViewResults) {
      onViewResults(execution.id);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: execution.status === "running" ? 2 : 1,
        borderColor: execution.status === "running" ? "info.main" : "divider",
      }}
    >
      {/* Header */}
      <CardContent
        sx={{
          pb: isExpanded ? 2 : 1.5,
          cursor: execution.status === "running" ? "default" : "pointer",
          "&:hover": {
            bgcolor: execution.status === "running" ? "inherit" : "action.hover",
          },
        }}
        onClick={execution.status === "running" ? undefined : handleToggle}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {execution.status !== "running" && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}

          <Typography variant="h6" sx={{ minWidth: 100 }}>
            Execution #{execution.executionNumber}
          </Typography>

          <Chip
            label={execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
            size="small"
            color={getStatusColor(execution.status)}
          />

          {execution.status === "completed" && execution.overallAccuracy !== undefined && (
            <Chip
              label={`${Math.round(execution.overallAccuracy)}% accuracy`}
              size="small"
              color={execution.overallAccuracy >= 70 ? "success" : "warning"}
            />
          )}

          <Chip
            label={`${execution.maxTrials} trials`}
            size="small"
            variant="outlined"
          />

          {execution.bestVariation && (
            <Chip
              label={execution.bestVariation}
              size="small"
              variant="outlined"
            />
          )}

          {execution.durationSeconds && (
            <Chip
              label={formatDuration(execution.durationSeconds)}
              size="small"
              variant="outlined"
            />
          )}

          <Box sx={{ flex: 1 }} />

          {execution.status === "completed" && onViewResults && (
            <Button
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewResults();
              }}
            >
              View Results
            </Button>
          )}
        </Box>

        {/* Running execution progress */}
        {execution.status === "running" && execution.progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {execution.progressMessage || "Processing..."}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {execution.progress}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={execution.progress} />
          </Box>
        )}
      </CardContent>

      {/* Expanded Content */}
      <Collapse in={isExpanded}>
        <Divider />
        <CardContent>
          {execution.status === "running" && (
            <Box>
              {/* Phase Progress */}
              <OptimizationStepper
                currentPhase={execution.currentPhase || 1}
                currentPhaseName={execution.currentPhaseName || ""}
                status="processing"
                phases={phases}
                progressMessage={execution.progressMessage}
              />

              {/* Variation Progress (Phase 4 only) */}
              {execution.currentPhase === 4 && variations.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Prompt Variations
                  </Typography>
                  <VariationProgressTable
                    variations={variations}
                    loading={true}
                  />
                </Box>
              )}
            </Box>
          )}

          {execution.status === "completed" && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Execution completed successfully.
              </Typography>
              {execution.overallAccuracy !== undefined && (
                <Typography variant="body1">
                  <strong>Overall Accuracy:</strong> {Math.round(execution.overallAccuracy)}%
                </Typography>
              )}
              {execution.bestVariation && (
                <Typography variant="body1">
                  <strong>Best Variation:</strong> {execution.bestVariation}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Completed at {execution.completedAt ? new Date(execution.completedAt).toLocaleString() : "—"}
              </Typography>
            </Box>
          )}

          {execution.status === "failed" && (
            <Box>
              <Typography variant="body2" color="error">
                Execution failed. Please check logs for details.
              </Typography>
            </Box>
          )}

          {execution.status === "pending" && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Execution queued. Waiting to start...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
}