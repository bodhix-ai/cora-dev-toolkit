/**
 * Schedule Presets Component
 * 
 * Toggle button group for selecting predefined schedule presets.
 * Provides options: Business Hours, 24/7, Custom, Off
 */

import React from "react";
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Paper,
} from "@mui/material";
import type { PresetName } from "../../../utils/schedulePresets";
import { PRESET_INFO } from "../../../utils/schedulePresets";

interface SchedulePresetsProps {
  selectedPreset: PresetName;
  onPresetChange: (preset: PresetName) => void;
  disabled?: boolean;
}

/**
 * Schedule Presets Component
 * 
 * Displays a toggle button group for selecting Lambda warming schedule presets.
 * Includes visual feedback and descriptions for each preset option.
 * 
 * @param selectedPreset - Currently selected preset
 * @param onPresetChange - Callback when preset changes
 * @param disabled - Whether the preset selector is disabled
 */
export default function SchedulePresets({
  selectedPreset,
  onPresetChange,
  disabled = false,
}: SchedulePresetsProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPreset: PresetName | null
  ) => {
    // Don't allow deselection - always have a preset selected
    if (newPreset !== null) {
      onPresetChange(newPreset);
    }
  };

  const presets: PresetName[] = ["business_hours", "24/7", "custom", "off"];

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Schedule Presets
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 2 }}
      >
        Choose a preset schedule or create your own custom configuration
      </Typography>

      <ToggleButtonGroup
        value={selectedPreset}
        exclusive
        onChange={handleChange}
        aria-label="schedule preset"
        disabled={disabled}
        fullWidth
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 1,
        }}
      >
        {presets.map((preset) => {
          const info = PRESET_INFO[preset];
          return (
            <ToggleButton
              key={preset}
              value={preset}
              aria-label={info.label}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
                textTransform: "none",
                border: "1px solid",
                borderColor: "divider",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                },
              }}
            >
              {/* Icon */}
              <Box sx={{ fontSize: "1.5rem", mb: 0.5 }}>{info.icon}</Box>

              {/* Label */}
              <Typography variant="subtitle2" component="div">
                {info.label}
              </Typography>

              {/* Description */}
              <Typography
                variant="caption"
                color="inherit"
                sx={{ opacity: 0.8, mt: 0.5 }}
              >
                {info.description}
              </Typography>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      {/* Additional info for custom preset */}
      {selectedPreset === "custom" && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: "info.lighter",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "info.light",
          }}
        >
          <Typography variant="caption" color="info.dark">
            💡 Custom mode allows you to configure individual days and time
            ranges. Click on any day below to edit its schedule.
          </Typography>
        </Box>
      )}

      {/* Warning for off preset */}
      {selectedPreset === "off" && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: "warning.lighter",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "warning.light",
          }}
        >
          <Typography variant="caption" color="warning.dark">
            ⚠️ Lambda warming is completely disabled. Functions will experience
            cold starts during peak usage.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
