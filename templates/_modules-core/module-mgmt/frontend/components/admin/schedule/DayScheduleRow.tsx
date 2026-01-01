/**
 * DayScheduleRow Component
 * Displays a single day's schedule with time ranges and edit capability
 */

import React from "react";
import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import type { DayName, DaySchedule } from "../../../types";
import { DAY_DISPLAY_NAMES } from "../../../types";

interface DayScheduleRowProps {
  day: DayName;
  schedule: DaySchedule;
  onEdit: (day: DayName) => void;
  disabled?: boolean;
}

/**
 * DayScheduleRow - Displays a single day's warming schedule
 * 
 * Shows the day name, whether it's enabled, and all configured time ranges.
 * Provides an edit button to modify the day's schedule.
 * 
 * @param day - The day of the week
 * @param schedule - The schedule configuration for this day
 * @param onEdit - Callback when edit button is clicked
 * @param disabled - Whether editing is disabled (e.g., when warming is off)
 */
export default function DayScheduleRow({
  day,
  schedule,
  onEdit,
  disabled = false,
}: DayScheduleRowProps) {
  const isEnabled = schedule.enabled && schedule.ranges.length > 0;

  const handleEdit = () => {
    if (!disabled) {
      onEdit(day);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        border: "1px solid",
        borderColor: isEnabled ? "primary.light" : "divider",
        borderRadius: 1,
        bgcolor: isEnabled ? "primary.lighter" : "background.paper",
        transition: "all 0.2s",
        "&:hover": {
          borderColor: isEnabled ? "primary.main" : "action.hover",
          bgcolor: isEnabled ? "primary.light" : "action.hover",
        },
      }}
    >
      {/* Day Name */}
      <Box sx={{ minWidth: 100 }}>
        <Typography
          variant="subtitle2"
          color={isEnabled ? "primary.main" : "text.secondary"}
          sx={{ fontWeight: isEnabled ? 600 : 400 }}
        >
          {DAY_DISPLAY_NAMES[day]}
        </Typography>
      </Box>

      {/* Time Ranges */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          mx: 2,
        }}
      >
        {!isEnabled ? (
          <Chip
            label="Inactive"
            size="small"
            variant="outlined"
            sx={{ color: "text.secondary" }}
          />
        ) : (
          schedule.ranges.map((range, index) => (
            <Chip
              key={index}
              label={`${range.start} - ${range.end}`}
              size="small"
              color="primary"
              variant="filled"
            />
          ))
        )}
      </Box>

      {/* Edit Button */}
      <Tooltip title={disabled ? "Enable warming to edit" : "Edit schedule"}>
        <span>
          <IconButton
            size="small"
            onClick={handleEdit}
            disabled={disabled}
            sx={{
              color: isEnabled ? "primary.main" : "action.active",
            }}
            aria-label={`Edit ${DAY_DISPLAY_NAMES[day]} schedule`}
          >
            <EditOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
