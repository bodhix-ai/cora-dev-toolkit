/**
 * Cost Calculation Utility
 * 
 * Cost estimation utilities for Lambda warming schedules.
 * Calculates monthly costs based on AWS Lambda pricing.
 */

import type { WeeklySchedule } from "../types";
import { calculateWeeklyHours } from "./schedulePresets";

/**
 * Cost estimate breakdown
 */
export interface CostEstimate {
  monthly: number;
  breakdown: {
    lambda: number;
    eventbridge: number;
    logs: number;
  };
  invocations: number;
  hours_per_week: number;
}

/**
 * AWS pricing constants (as of 2025)
 * Based on actual AWS Lambda pricing
 * Lambda is very inexpensive for warming functions!
 */
const PRICING = {
  // Lambda invocation cost (per request)
  LAMBDA_REQUEST: 0.0000002, // $0.20 per 1M requests

  // Lambda compute cost (per GB-second)
  // For a 256MB function (0.25GB) running ~300ms average (includes cold starts)
  // Cost: $0.0000166667 per GB-second * 0.25GB * 0.3s = $0.00000125
  LAMBDA_COMPUTE_PER_INVOCATION: 0.00000125,

  // EventBridge custom events cost
  // Free for first 4M events/month, then $1 per million
  // For warming use cases, this is essentially free
  EVENTBRIDGE_PER_INVOCATION: 0,

  // CloudWatch Logs ingestion (per GB)
  CLOUDWATCH_LOGS_PER_GB: 0.5,

  // Average log size per invocation (bytes) - minimal logging for warmer
  AVG_LOG_SIZE_BYTES: 500,

  // Weeks per month (average)
  WEEKS_PER_MONTH: 4.33,
};

/**
 * Calculate monthly cost estimate for a Lambda warming schedule
 * 
 * @param schedule - Weekly warming schedule
 * @param intervalMinutes - Warming interval in minutes
 * @returns Cost estimate with monthly total and breakdown
 */
export function calculateMonthlyCost(
  schedule: WeeklySchedule,
  intervalMinutes: number = 5
): CostEstimate {
  // Calculate total hours per week
  const hoursPerWeek = calculateWeeklyHours(schedule);

  // Calculate invocations per week
  const invocationsPerHour = 60 / intervalMinutes;
  const invocationsPerWeek = hoursPerWeek * invocationsPerHour;

  // Calculate monthly invocations
  const monthlyInvocations = invocationsPerWeek * PRICING.WEEKS_PER_MONTH;

  // Calculate costs
  const lambdaRequestCost = monthlyInvocations * PRICING.LAMBDA_REQUEST;

  const lambdaComputeCost =
    monthlyInvocations * PRICING.LAMBDA_COMPUTE_PER_INVOCATION;

  const eventBridgeCost =
    monthlyInvocations * PRICING.EVENTBRIDGE_PER_INVOCATION;

  // CloudWatch Logs cost
  const totalLogBytes = monthlyInvocations * PRICING.AVG_LOG_SIZE_BYTES;
  const totalLogGB = totalLogBytes / (1024 * 1024 * 1024);
  const cloudWatchCost = totalLogGB * PRICING.CLOUDWATCH_LOGS_PER_GB;

  const totalLambdaCost = lambdaRequestCost + lambdaComputeCost;
  const totalMonthlyCost = totalLambdaCost + eventBridgeCost + cloudWatchCost;

  return {
    monthly: parseFloat(totalMonthlyCost.toFixed(2)),
    breakdown: {
      lambda: parseFloat(totalLambdaCost.toFixed(2)),
      eventbridge: parseFloat(eventBridgeCost.toFixed(2)),
      logs: parseFloat(cloudWatchCost.toFixed(2)),
    },
    invocations: Math.round(monthlyInvocations),
    hours_per_week: parseFloat(hoursPerWeek.toFixed(1)),
  };
}

/**
 * Format cost for display
 * 
 * @param amount - Cost amount in dollars
 * @returns Formatted cost string (e.g., "$1.23")
 */
export function formatCost(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format invocations count for display
 * 
 * @param count - Number of invocations
 * @returns Formatted count (e.g., "1.2M", "500K", "100")
 */
export function formatInvocations(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Get cost impact level (low, medium, high)
 * Lambda warming is very inexpensive - costs are typically under $1/month
 * 
 * @param monthlyCost - Monthly cost in dollars
 * @returns Impact level
 */
export function getCostImpactLevel(
  monthlyCost: number
): "low" | "medium" | "high" {
  if (monthlyCost < 0.5) return "low";
  if (monthlyCost < 2) return "medium";
  return "high";
}

/**
 * Get cost impact color for MUI components
 * 
 * @param level - Cost impact level
 * @returns MUI color name
 */
export function getCostImpactColor(
  level: "low" | "medium" | "high"
): "success" | "warning" | "error" {
  switch (level) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "error";
  }
}

/**
 * Calculate potential savings by optimizing schedule
 * 
 * @param currentSchedule - Current warming schedule
 * @param optimizedSchedule - Optimized warming schedule
 * @param intervalMinutes - Warming interval in minutes
 * @returns Savings calculation
 */
export function calculatePotentialSavings(
  currentSchedule: WeeklySchedule,
  optimizedSchedule: WeeklySchedule,
  intervalMinutes: number = 5
): {
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
} {
  const current = calculateMonthlyCost(currentSchedule, intervalMinutes);
  const optimized = calculateMonthlyCost(optimizedSchedule, intervalMinutes);

  const savings = current.monthly - optimized.monthly;
  const savingsPercentage =
    current.monthly > 0 ? (savings / current.monthly) * 100 : 0;

  return {
    currentCost: current.monthly,
    optimizedCost: optimized.monthly,
    savings: parseFloat(savings.toFixed(2)),
    savingsPercentage: parseFloat(savingsPercentage.toFixed(1)),
  };
}

/**
 * Estimate annual cost
 * 
 * @param monthlyCost - Monthly cost in dollars
 * @returns Annual cost
 */
export function calculateAnnualCost(monthlyCost: number): number {
  return parseFloat((monthlyCost * 12).toFixed(2));
}

/**
 * Get cost breakdown description for tooltip
 * 
 * @param estimate - Cost estimate
 * @returns Formatted breakdown description
 */
export function getCostBreakdownDescription(estimate: CostEstimate): string {
  return `
Monthly Breakdown:
• Lambda Executions: ${formatCost(estimate.breakdown.lambda)}
  - ${formatInvocations(estimate.invocations)} invocations
  - Running ${estimate.hours_per_week} hours/week
• CloudWatch Logs: ${formatCost(estimate.breakdown.logs)}
• EventBridge: ${formatCost(estimate.breakdown.eventbridge)} (free tier)

Total: ${formatCost(estimate.monthly)}/month
Annual: ${formatCost(calculateAnnualCost(estimate.monthly))}/year
  `.trim();
}
