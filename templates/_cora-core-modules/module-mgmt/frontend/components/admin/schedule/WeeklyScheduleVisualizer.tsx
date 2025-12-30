/**
 * WeeklyScheduleVisualizer Component
 * Displays the complete 7-day schedule with visual grid layout
 */

import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { WeeklySchedule, DayName } from "../../../types";
import { DAY_NAMES } from "../../../types";
import DayScheduleRow from "./DayScheduleRow";

interface WeeklyScheduleVisualizerProps {
  schedule: WeeklySchedule;
  onEditDay: (day: DayName) => void;
  disabled?: boolean;
}

/**
 * WeeklyScheduleVisualizer - Displays the full week's warming schedule
 * 
 * Shows all 7 days of the week with their configured time ranges.
 * Each day can be clicked to edit its schedule.
 * 
 * @param schedule - The weekly schedule configuration
 * @param onEditDay - Callback when a day's edit button is clicked
 * @param disabled - Whether editing is disabled (e.g., when warming is off)
 */
export default function WeeklyScheduleVisualizer({
  schedule,
  onEditDay,
  disabled = false,
}: WeeklyScheduleVisualizerProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Weekly Schedule
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 2 }}
      >
        Configure warming times for each day of the week
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {DAY_NAMES.map((day) => (
          <DayScheduleRow
            key={day}
            day={day}
            schedule={schedule[day]}
            onEdit={onEditDay}
            disabled={disabled}
          />
        ))}
      </Box>

      {disabled && (
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
            ℹ️ Enable Lambda warming above to edit the schedule
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
