/**
 * Cost Tab Component
 *
 * Displays Lambda warming cost estimates based on current schedule configuration.
 * Shows detailed cost breakdown, usage statistics, and optimization tips.
 */

import React from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { useLambdaWarming } from "../../hooks/useLambdaWarming";
import CostCalculator from "./schedule/CostCalculator";

/**
 * Cost Tab - Lambda Warming Cost Analysis
 *
 * Displays real-time cost estimates for Lambda warming based on:
 * - Current weekly schedule configuration
 * - Warming interval (check frequency)
 * - Whether warming is enabled/disabled
 *
 * Provides detailed breakdown including:
 * - Monthly and annual cost projections
 * - Cost by service (Lambda, CloudWatch, EventBridge)
 * - Usage statistics (invocations, hours/week)
 * - Cost optimization recommendations
 *
 * @example
 * ```tsx
 * <CostTab />
 * ```
 */
export function CostTab(): React.ReactElement {
  const { authAdapter } = useUser();
  const { config, loading, error } = useLambdaWarming(authAdapter);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Cost Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Estimated costs for Lambda warming based on your current schedule
        configuration.
      </Typography>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load Lambda warming configuration: {error}
        </Alert>
      )}

      {/* Cost Calculator */}
      {!loading && !error && config && (
        <CostCalculator
          schedule={config.weekly_schedule}
          intervalMinutes={config.interval_minutes}
          enabled={config.enabled}
        />
      )}

      {/* No Config State */}
      {!loading && !error && !config && (
        <Alert severity="info">
          No Lambda warming configuration found. Configure warming in the
          Schedule tab to see cost estimates.
        </Alert>
      )}
    </Box>
  );
}

export default CostTab;
