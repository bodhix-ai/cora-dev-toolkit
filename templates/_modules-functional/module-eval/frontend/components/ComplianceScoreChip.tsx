/**
 * ComplianceScoreChip - Configuration-based compliance score display
 *
 * Displays evaluation compliance score based on org/system configuration:
 * - Base: Status chip with name/color (always shown)
 * - Additional: Numerical score chip (shown when show_decimal_score = true)
 */

"use client";

import React from "react";
import { Box, Chip } from "@mui/material";

// =============================================================================
// TYPES
// =============================================================================

export interface StatusOption {
  id: string;
  name: string;
  color: "success" | "warning" | "error" | "info" | "default";
  scoreValue: number;
}

export interface ScoreConfig {
  categoricalMode: "boolean" | "detailed";
  showDecimalScore: boolean;
}

export interface ComplianceScoreChipProps {
  /** Compliance score (0-100) */
  score: number;
  /** Configuration from evaluation API */
  config: ScoreConfig;
  /** Status options for mapping score to status */
  statusOptions: StatusOption[];
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Custom class name */
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map score to status option based on thresholds
 */
export function getStatusForScore(
  score: number,
  statusOptions: StatusOption[]
): StatusOption {
  // Sort status options by score_value DESC
  const sorted = [...statusOptions].sort((a, b) => b.scoreValue - a.scoreValue);

  // Find first option where score >= scoreValue
  for (const option of sorted) {
    if (score >= option.scoreValue) {
      return option;
    }
  }

  // Fallback to lowest option (should never happen if data is correct)
  return sorted[sorted.length - 1];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ComplianceScoreChip({
  score,
  config,
  statusOptions,
  size = "large",
  className = "",
}: ComplianceScoreChipProps) {
  // Find matching status option
  const statusOption = getStatusForScore(score, statusOptions);

  // Size variants
  const sizeStyles = {
    small: { height: "32px", fontSize: "0.875rem" },
    medium: { height: "40px", fontSize: "1rem" },
    large: { height: "56px", fontSize: "1.125rem" },
  };

  const scoreSizeStyles = {
    small: { height: "32px", fontSize: "0.875rem" },
    medium: { height: "40px", fontSize: "1rem" },
    large: { height: "56px", fontSize: "1.5rem" },
  };

  return (
    <Box
      className={className}
      sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
    >
      {/* Status name chip - ALWAYS shown */}
      <Chip
        label={statusOption.name}
        color={statusOption.color}
        sx={{
          ...sizeStyles[size],
          fontWeight: "medium",
          paddingX: size === "large" ? 3 : 2,
        }}
      />

      {/* Numerical score chip - shown when show_decimal_score = true */}
      {config.showDecimalScore && (
        <Chip
          label={`${score.toFixed(0)}%`}
          color={statusOption.color}
          sx={{
            ...scoreSizeStyles[size],
            fontWeight: "bold",
            minWidth: size === "large" ? "80px" : "60px",
          }}
        />
      )}
    </Box>
  );
}

export default ComplianceScoreChip;
