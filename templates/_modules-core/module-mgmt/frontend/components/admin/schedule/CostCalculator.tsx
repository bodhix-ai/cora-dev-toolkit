/**
 * Cost Calculator Component
 * 
 * Displays estimated monthly costs for Lambda warming based on schedule configuration.
 * Shows cost breakdown, usage statistics, and optimization tips.
 */

import React from "react";
import {
  Alert,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { WeeklySchedule } from "../../../types";
import {
  calculateMonthlyCost,
  calculateAnnualCost,
  formatCost,
  formatInvocations,
  getCostImpactLevel,
  getCostImpactColor,
  getCostBreakdownDescription,
} from "../../../utils/costCalculation";

interface CostCalculatorProps {
  schedule: WeeklySchedule;
  intervalMinutes: number;
  enabled: boolean;
}

/**
 * Cost Calculator Component
 * 
 * Calculates and displays the estimated monthly cost of Lambda warming
 * based on the configured schedule and interval.
 * 
 * @param schedule - Weekly warming schedule
 * @param intervalMinutes - Warming interval in minutes
 * @param enabled - Whether Lambda warming is enabled
 */
export default function CostCalculator({
  schedule,
  intervalMinutes,
  enabled,
}: CostCalculatorProps) {
  // Calculate cost estimate
  const estimate = calculateMonthlyCost(schedule, intervalMinutes);
  const annualCost = calculateAnnualCost(estimate.monthly);
  const impactLevel = getCostImpactLevel(estimate.monthly);
  const impactColor = getCostImpactColor(impactLevel);

  // If warming is disabled, show zero cost
  if (!enabled) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">
            <strong>Cost Impact:</strong> $0.00/month (Lambda warming is
            disabled)
          </Typography>
        </Box>
      </Alert>
    );
  }

  // If no hours scheduled, show zero cost
  if (estimate.hours_per_week === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">
            <strong>Cost Impact:</strong> $0.00/month (No hours scheduled)
          </Typography>
        </Box>
      </Alert>
    );
  }

  return (
    <Alert severity={impactColor} sx={{ mt: 2 }}>
      <Box>
        {/* Main Cost Display */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">
              <strong>Estimated Monthly Cost:</strong>{" "}
              {formatCost(estimate.monthly)}
            </Typography>
            <Chip
              label={`${impactLevel.toUpperCase()} impact`}
              color={impactColor}
              size="small"
            />
            <Tooltip
              title={
                <pre style={{ margin: 0 }}>
                  {getCostBreakdownDescription(estimate)}
                </pre>
              }
              placement="top"
            >
              <IconButton 
                size="small" 
                sx={{ ml: 0.5 }}
                aria-label="View cost breakdown details"
              >
                <InfoOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Cost Breakdown */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Breakdown:</strong>
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              pl: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Lambda Executions:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCost(estimate.breakdown.lambda)}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              CloudWatch Logs:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCost(estimate.breakdown.logs)}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              EventBridge:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCost(estimate.breakdown.eventbridge)} (free tier)
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Usage Statistics */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Usage Statistics:</strong>
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              pl: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Monthly Invocations:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatInvocations(estimate.invocations)}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Hours per Week:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {estimate.hours_per_week.toFixed(1)} hours
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Check Interval:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Every {intervalMinutes} minutes
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Annual Projection */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Annual Projection:</strong> {formatCost(annualCost)}/year
          </Typography>
        </Box>

        {/* Cost Optimization Tip */}
        {impactLevel === "high" && (
          <Box sx={{ mt: 1, p: 1, bgcolor: "warning.light", borderRadius: 1 }}>
            <Typography variant="caption" color="text.primary">
              💡 <strong>Tip:</strong> Consider reducing warming hours or
              increasing the interval to lower costs. A typical schedule costs
              under $1/month.
            </Typography>
          </Box>
        )}

        {/* Why So Cheap? */}
        {impactLevel === "low" && estimate.monthly < 0.1 && (
          <Box sx={{ mt: 1, p: 1, bgcolor: "info.lighter", borderRadius: 1 }}>
            <Typography variant="caption" color="info.dark">
              ℹ️ Lambda warming is extremely cost-effective! Functions are
              billed per millisecond, and EventBridge is free for the first 4M
              events/month. This makes it perfect for preventing cold starts.
            </Typography>
          </Box>
        )}
      </Box>
    </Alert>
  );
}
