/**
 * Scoring Utilities for CORA Evaluation Module
 * 
 * Maps numerical AI scores (0-100) to rubric tier labels and handles
 * scoring rubric formatting for display.
 */

export interface ScoringRubricTier {
  min: number;
  max: number;
  label: string;
  description: string;
}

export interface ScoringRubric {
  tiers: ScoringRubricTier[];
}

/**
 * Default 5-tier rubric (matches database default in eval_criteria_sets)
 */
export const DEFAULT_RUBRIC: ScoringRubric = {
  tiers: [
    {
      min: 0,
      max: 20,
      label: "Non-Compliant",
      description: "Criterion not addressed or completely fails requirement"
    },
    {
      min: 21,
      max: 40,
      label: "Mostly Non-Compliant",
      description: "Significant gaps exist, fails key aspects"
    },
    {
      min: 41,
      max: 60,
      label: "Partially Compliant",
      description: "Addresses some requirements but incomplete"
    },
    {
      min: 61,
      max: 80,
      label: "Mostly Compliant",
      description: "Meets most requirements with minor gaps"
    },
    {
      min: 81,
      max: 100,
      label: "Fully Compliant",
      description: "Fully meets or exceeds requirement with clear evidence"
    }
  ]
};

/**
 * Maps a numerical score (0-100) to a rubric tier label.
 * 
 * @param score - Numerical score from AI (0-100)
 * @param rubric - Optional custom rubric (defaults to 5-tier standard)
 * @returns Status label string (e.g., "Fully Compliant")
 * 
 * @example
 * getStatusFromScore(85) // => "Fully Compliant"
 * getStatusFromScore(45) // => "Partially Compliant"
 * getStatusFromScore(null) // => "Not Evaluated"
 */
export function getStatusFromScore(
  score: number | null | undefined,
  rubric?: ScoringRubric
): string {
  // Handle null/undefined scores
  if (score === null || score === undefined) {
    return "Not Evaluated";
  }

  // Clamp score to 0-100 range
  const clampedScore = Math.max(0, Math.min(100, score));

  // Use provided rubric or default
  const activeRubric = rubric || DEFAULT_RUBRIC;

  // Find matching tier
  for (const tier of activeRubric.tiers) {
    if (clampedScore >= tier.min && clampedScore <= tier.max) {
      return tier.label;
    }
  }

  // Fallback (should never happen with proper rubric)
  return "Unknown";
}

/**
 * Gets the full tier object for a given score.
 * 
 * @param score - Numerical score from AI (0-100)
 * @param rubric - Optional custom rubric
 * @returns Tier object or null if not found
 */
export function getTierFromScore(
  score: number | null | undefined,
  rubric?: ScoringRubric
): ScoringRubricTier | null {
  if (score === null || score === undefined) {
    return null;
  }

  const clampedScore = Math.max(0, Math.min(100, score));
  const activeRubric = rubric || DEFAULT_RUBRIC;

  for (const tier of activeRubric.tiers) {
    if (clampedScore >= tier.min && clampedScore <= tier.max) {
      return tier;
    }
  }

  return null;
}

/**
 * Gets a color class for a score (for UI styling).
 * 
 * @param score - Numerical score from AI (0-100)
 * @returns Tailwind color class string
 * 
 * @example
 * getScoreColorClass(85) // => "text-green-600"
 * getScoreColorClass(45) // => "text-yellow-600"
 */
export function getScoreColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return "text-gray-400";
  }

  const clampedScore = Math.max(0, Math.min(100, score));

  if (clampedScore >= 81) return "text-green-600";
  if (clampedScore >= 61) return "text-blue-600";
  if (clampedScore >= 41) return "text-yellow-600";
  if (clampedScore >= 21) return "text-orange-600";
  return "text-red-600";
}

/**
 * Formats a score as a percentage string.
 * 
 * @param score - Numerical score (0-100)
 * @param includePercent - Whether to include "%" symbol
 * @returns Formatted string
 */
export function formatScore(
  score: number | null | undefined,
  includePercent: boolean = true
): string {
  if (score === null || score === undefined) {
    return "—";
  }

  const formatted = Math.round(score).toString();
  return includePercent ? `${formatted}%` : formatted;
}