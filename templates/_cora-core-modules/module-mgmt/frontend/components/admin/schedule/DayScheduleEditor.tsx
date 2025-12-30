/**
 * DayScheduleEditor Component
 * Modal dialog for editing a single day's schedule with time ranges
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  Checkbox,
  FormGroup,
  Paper,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { parse, format } from "date-fns";
import type { DayName, DaySchedule, TimeRange } from "../../../types";
import { DAY_DISPLAY_NAMES, DAY_NAMES } from "../../../types";
import { isValidTimeRange } from "../../../utils/schedulePresets";

interface DayScheduleEditorProps {
  day: DayName;
  schedule: DaySchedule;
  timezone: string;
  onSave: (days: DayName[], schedule: DaySchedule) => void;
  onClose: () => void;
  open: boolean;
}

/**
 * DayScheduleEditor - Modal dialog for editing a day's warming schedule
 * 
 * Provides a comprehensive interface for:
 * - Enabling/disabling a day
 * - Adding/removing time ranges
 * - Validating time ranges (no overlaps, valid times)
 * - Applying schedule to multiple days at once
 * 
 * @param day - The primary day being edited
 * @param schedule - Current schedule for the day
 * @param timezone - IANA timezone for the schedule
 * @param onSave - Callback when changes are saved
 * @param onClose - Callback when dialog is closed
 * @param open - Whether the dialog is open
 */
export default function DayScheduleEditor({
  day,
  schedule,
  timezone,
  onSave,
  onClose,
  open,
}: DayScheduleEditorProps) {
  const [enabled, setEnabled] = useState(schedule.enabled);
  const [ranges, setRanges] = useState<TimeRange[]>(schedule.ranges);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<DayName>>(
    new Set([day])
  );

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      // If editing an inactive day, automatically enable it
      // (user clicked "Edit" so they want to configure it)
      const shouldEnable = !schedule.enabled ? true : schedule.enabled;
      setEnabled(shouldEnable);
      setRanges(schedule.ranges.length > 0 ? schedule.ranges : []);
      setError(null);
      setSelectedDays(new Set([day])); // Reset to only the current day
    }
  }, [open, schedule, day]);

  const handleDayToggle = (dayName: DayName) => {
    const newSelected = new Set(selectedDays);
    if (dayName === day) {
      // Can't deselect the primary day being edited
      return;
    }
    if (newSelected.has(dayName)) {
      newSelected.delete(dayName);
    } else {
      newSelected.add(dayName);
    }
    setSelectedDays(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedDays(new Set(DAY_NAMES));
  };

  const handleDeselectAll = () => {
    // Can only deselect all except the primary day
    setSelectedDays(new Set([day]));
  };

  const handleAddRange = () => {
    // Add a default range (9am-5pm)
    setRanges([...ranges, { start: "09:00", end: "17:00" }]);
    setError(null);
  };

  const handleRemoveRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
    setError(null);
  };

  const handleRangeChange = (
    index: number,
    field: "start" | "end",
    value: Date | null
  ) => {
    if (!value) return;

    const timeString = format(value, "HH:mm");
    const newRanges = [...ranges];
    newRanges[index] = {
      ...newRanges[index],
      [field]: timeString,
    };
    setRanges(newRanges);
    setError(null);
  };

  const validateAndSave = () => {
    // Validate all ranges
    if (enabled && ranges.length === 0) {
      setError("Please add at least one time range or disable this day");
      return;
    }

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (!isValidTimeRange(range.start, range.end)) {
        setError(
          `Invalid time range ${i + 1}: End time must be after start time`
        );
        return;
      }
    }

    // Check for overlapping ranges
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const range1 = ranges[i];
        const range2 = ranges[j];

        const start1 = timeToMinutes(range1.start);
        const end1 = timeToMinutes(range1.end);
        const start2 = timeToMinutes(range2.start);
        const end2 = timeToMinutes(range2.end);

        // Check if ranges overlap
        if (
          (start1 >= start2 && start1 < end2) ||
          (end1 > start2 && end1 <= end2) ||
          (start2 >= start1 && start2 < end1) ||
          (end2 > start1 && end2 <= end1)
        ) {
          setError(`Time ranges ${i + 1} and ${j + 1} overlap`);
          return;
        }
      }
    }

    // Save the schedule
    const newSchedule: DaySchedule = {
      enabled: enabled && ranges.length > 0,
      ranges: enabled ? ranges : [],
    };

    // Convert Set to Array for the callback
    onSave(Array.from(selectedDays), newSchedule);
    onClose();
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const parseTime = (timeString: string): Date => {
    return parse(timeString, "HH:mm", new Date());
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: "400px" },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">
              Edit {DAY_DISPLAY_NAMES[day]} Schedule
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  aria-label={`Toggle ${DAY_DISPLAY_NAMES[day]} schedule active or inactive`}
                />
              }
              label={enabled ? "Active" : "Inactive"}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Timezone: {timezone}
          </Typography>
          {selectedDays.size > 1 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              This schedule will be applied to {selectedDays.size} days
            </Alert>
          )}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Apply to Multiple Days Section */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2">
                Apply this schedule to:
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleSelectAll}
                  sx={{ textTransform: "none" }}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleDeselectAll}
                  disabled={selectedDays.size === 1}
                  sx={{ textTransform: "none" }}
                >
                  Deselect All
                </Button>
              </Box>
            </Box>
            <FormGroup row>
              {DAY_NAMES.map((dayName) => (
                <FormControlLabel
                  key={dayName}
                  control={
                    <Checkbox
                      checked={selectedDays.has(dayName)}
                      onChange={() => handleDayToggle(dayName)}
                      disabled={dayName === day} // Primary day can't be unchecked
                      aria-label={`Apply schedule to ${DAY_DISPLAY_NAMES[dayName]}`}
                    />
                  }
                  label={DAY_DISPLAY_NAMES[dayName]}
                  sx={{ minWidth: 120 }}
                />
              ))}
            </FormGroup>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              💡 Select multiple days to apply the same schedule to all at once
            </Typography>
          </Paper>

          {!enabled ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              This day is currently inactive. Enable it above to add time
              ranges.
            </Alert>
          ) : ranges.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No time ranges configured. Add at least one time range or disable
              this day.
            </Alert>
          ) : null}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {ranges.map((range, index) => (
              <Box key={index}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ minWidth: 80 }}>
                    Range {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveRange(index)}
                    disabled={!enabled}
                    aria-label={`Remove range ${index + 1}`}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TimePicker
                    label="Start Time"
                    value={parseTime(range.start)}
                    onChange={(newValue) =>
                      handleRangeChange(index, "start", newValue)
                    }
                    disabled={!enabled}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    to
                  </Typography>
                  <TimePicker
                    label="End Time"
                    value={parseTime(range.end)}
                    onChange={(newValue) =>
                      handleRangeChange(index, "end", newValue)
                    }
                    disabled={!enabled}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                </Box>

                {index < ranges.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </Box>

          <Button
            startIcon={<Add />}
            onClick={handleAddRange}
            disabled={!enabled}
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
            aria-label="Add time range"
          >
            Add Time Range
          </Button>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              💡 <strong>Tip:</strong> You can add multiple time ranges for
              split schedules (e.g., 9am-12pm and 1pm-5pm).
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={validateAndSave} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
