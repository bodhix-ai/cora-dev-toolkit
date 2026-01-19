/**
 * ScoringConfigPanel - Scoring Configuration Panel Component
 *
 * Admin component for configuring evaluation scoring settings.
 * Supports system-level defaults and org-level overrides.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Alert,
  Chip,
  Radio,
  RadioGroup,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type {
  EvalSysConfig,
  EvalOrgConfig,
  UpdateSysConfigInput,
  UpdateOrgConfigInput,
  CategoricalMode,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface ScoringConfigPanelProps {
  /** Current configuration (sys or org merged with sys) */
  config: {
    categoricalMode: CategoricalMode;
    showNumericalScore: boolean;
    isOrgOverride?: {
      categoricalMode: boolean;
      showNumericalScore: boolean;
    };
  };
  /** System config (for reference in org view) */
  sysConfig?: EvalSysConfig;
  /** Whether editing system-level config */
  isSystemLevel?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when saving config */
  onSave: (input: UpdateSysConfigInput | UpdateOrgConfigInput) => Promise<void>;
  /** Callback when resetting to system defaults (org level only) */
  onResetField?: (field: "categoricalMode" | "showNumericalScore") => Promise<void>;
  /** Custom class name */
  className?: string;
}

export interface ScoringModeCardProps {
  /** Mode value */
  mode: CategoricalMode;
  /** Whether selected */
  isSelected: boolean;
  /** Whether disabled */
  disabled?: boolean;
  /** Whether this is an org override */
  isOverride?: boolean;
  /** Callback when selected */
  onSelect: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MODE_INFO: Record<CategoricalMode, { title: string; description: string; examples: string[] }> = {
  boolean: {
    title: "Boolean Mode",
    description: "Simple pass/fail evaluation with two status options",
    examples: ["Compliant / Non-Compliant", "Pass / Fail", "Yes / No"],
  },
  detailed: {
    title: "Detailed Mode",
    description: "Multiple status levels for nuanced evaluation",
    examples: [
      "Fully Compliant / Partially Compliant / Non-Compliant",
      "Excellent / Good / Needs Improvement / Poor",
      "Met / Partially Met / Not Met / Not Applicable",
    ],
  },
};

// =============================================================================
// SCORING MODE CARD
// =============================================================================

export function ScoringModeCard({
  mode,
  isSelected,
  disabled = false,
  isOverride = false,
  onSelect,
}: ScoringModeCardProps) {
  const info = MODE_INFO[mode];

  return (
    <Card
      onClick={!disabled ? onSelect : undefined}
      sx={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        border: 2,
        borderColor: isSelected ? "primary.main" : "grey.300",
        bgcolor: isSelected ? "primary.50" : "background.paper",
        transition: "all 0.2s",
        "&:hover": disabled ? {} : {
          borderColor: isSelected ? "primary.main" : "grey.400",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {info.title}
              </Typography>
              {isSelected && (
                <Chip label="Active" size="small" color="primary" />
              )}
              {isOverride && isSelected && (
                <Chip label="Override" size="small" color="secondary" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {info.description}
            </Typography>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Examples:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, listStyle: "disc" }}>
                {info.examples.map((ex, i) => (
                  <Typography key={i} component="li" variant="caption" color="text.secondary">
                    {ex}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              ml: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSelected && (
              <CheckCircleIcon color="primary" />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SCORING CONFIG PANEL
// =============================================================================

export function ScoringConfigPanel({
  config,
  sysConfig,
  isSystemLevel = false,
  isSaving = false,
  error,
  onSave,
  onResetField,
  className = "",
}: ScoringConfigPanelProps) {
  const [categoricalMode, setCategoricalMode] = useState<CategoricalMode>(
    config.categoricalMode
  );
  const [showNumericalScore, setShowNumericalScore] = useState(
    config.showNumericalScore
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state when config prop changes (e.g., after API load)
  useEffect(() => {
    setCategoricalMode(config.categoricalMode);
    setShowNumericalScore(config.showNumericalScore);
    setHasChanges(false);
  }, [config.categoricalMode, config.showNumericalScore]);

  const handleModeChange = (mode: CategoricalMode) => {
    setCategoricalMode(mode);
    setHasChanges(true);
  };

  const handleNumericalChange = (show: boolean) => {
    setShowNumericalScore(show);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setLocalError(null);
      if (isSystemLevel) {
        await onSave({
          categoricalMode,
          showNumericalScore,
        });
      } else {
        // For org level, only send if different from current
        const input: UpdateOrgConfigInput = {};
        if (categoricalMode !== config.categoricalMode) {
          input.categoricalMode = categoricalMode;
        }
        if (showNumericalScore !== config.showNumericalScore) {
          input.showNumericalScore = showNumericalScore;
        }
        await onSave(input);
      }
      setHasChanges(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleResetMode = async () => {
    if (!onResetField || !sysConfig) return;
    try {
      await onResetField("categoricalMode");
      setCategoricalMode(sysConfig.categoricalMode);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const handleResetNumerical = async () => {
    if (!onResetField || !sysConfig) return;
    try {
      await onResetField("showNumericalScore");
      setShowNumericalScore(sysConfig.showNumericalScore);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to reset");
    }
  };

  const displayError = error || localError;

  return (
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Scoring Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isSystemLevel
            ? "Configure default scoring settings for all organizations"
            : "Configure scoring settings for your organization"}
        </Typography>
      </Box>

      {/* Categorical Mode */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              Evaluation Mode
            </Typography>
            <Typography variant="body2" color="text.secondary">
              How criteria results are categorized
            </Typography>
          </Box>
          {!isSystemLevel && config.isOrgOverride?.categoricalMode && onResetField && (
            <Button
              onClick={handleResetMode}
              disabled={isSaving}
              size="small"
              color="primary"
            >
              Reset to default
            </Button>
          )}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <ScoringModeCard
            mode="boolean"
            isSelected={categoricalMode === "boolean"}
            disabled={isSaving}
            isOverride={!isSystemLevel && config.isOrgOverride?.categoricalMode}
            onSelect={() => handleModeChange("boolean")}
          />
          <ScoringModeCard
            mode="detailed"
            isSelected={categoricalMode === "detailed"}
            disabled={isSaving}
            isOverride={!isSystemLevel && config.isOrgOverride?.categoricalMode}
            onSelect={() => handleModeChange("detailed")}
          />
        </Box>
      </Box>

      {/* Numerical Score Toggle */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              Numerical Compliance Score
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Display a percentage-based compliance score
            </Typography>
          </Box>
          {!isSystemLevel && config.isOrgOverride?.showNumericalScore && onResetField && (
            <Button
              onClick={handleResetNumerical}
              disabled={isSaving}
              size="small"
              color="primary"
            >
              Reset to default
            </Button>
          )}
        </Box>
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body1" fontWeight="medium">
                    Show numerical score
                  </Typography>
                  {!isSystemLevel && config.isOrgOverride?.showNumericalScore && (
                    <Chip label="Override" size="small" color="secondary" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Display compliance as a percentage (e.g., 84% compliant)
                </Typography>
              </Box>
              <Switch
                checked={showNumericalScore}
                onChange={(e) => handleNumericalChange(e.target.checked)}
                disabled={isSaving}
                color="primary"
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* System Default Reference (for org level) */}
      {!isSystemLevel && sysConfig && (
        <Card sx={{ mb: 3, bgcolor: "grey.50" }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              System Defaults
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Mode:</strong>{" "}
                {sysConfig.categoricalMode === "boolean" ? "Boolean" : "Detailed"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Numerical Score:</strong>{" "}
                {sysConfig.showNumericalScore ? "Enabled" : "Disabled"}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {displayError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {displayError}
        </Alert>
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          variant="contained"
          color="primary"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Box>
  );
}

export default ScoringConfigPanel;
