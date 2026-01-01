/**
 * Timezone Selector Component
 * 
 * Dropdown for selecting timezone for Lambda warming schedule configuration.
 * All schedule times are interpreted in the selected timezone.
 */

import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { Public } from "@mui/icons-material";

interface TimezoneSelectorProps {
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
  disabled?: boolean;
}

// Common US and international timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
];

/**
 * Timezone Selector Component
 * 
 * Displays a dropdown for selecting the timezone used for schedule interpretation.
 * Includes common US and international timezones.
 * 
 * @param selectedTimezone - Currently selected timezone (IANA format)
 * @param onTimezoneChange - Callback when timezone changes
 * @param disabled - Whether the selector is disabled
 */
export default function TimezoneSelector({
  selectedTimezone,
  onTimezoneChange,
  disabled = false,
}: TimezoneSelectorProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onTimezoneChange(event.target.value);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="timezone-selector-label">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Public fontSize="small" />
            Timezone
          </Box>
        </InputLabel>
        <Select
          labelId="timezone-selector-label"
          id="timezone-selector"
          value={selectedTimezone}
          label="Timezone"
          onChange={handleChange}
        >
          {TIMEZONES.map((tz) => (
            <MenuItem key={tz.value} value={tz.value}>
              {tz.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: "block" }}
      >
        All schedule times are interpreted in the selected timezone
      </Typography>
    </Box>
  );
}
