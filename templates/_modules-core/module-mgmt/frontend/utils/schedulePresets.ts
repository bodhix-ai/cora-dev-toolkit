/**
 * Schedule Presets Utility
 * 
 * Preset schedule configurations for Lambda warming.
 * Provides predefined schedules (Business Hours, 24/7, Off, Custom)
 * and utility functions for schedule manipulation.
 */

import type {
  WeeklySchedule,
  DaySchedule,
  DayOfWeek,
  TimeRange,
} from "../types";

const DISABLED_DAY: DaySchedule = {
  enabled: false,
  ranges: [],
};

const FULL_DAY: DaySchedule = {
  enabled: true,
  ranges: [{ start: "00:00", end: "23:59" }],
};

const BUSINESS_HOURS_DAY: DaySchedule = {
  enabled: true,
  ranges: [{ start: "09:00", end: "17:00" }],
};

/**
 * Preset names for Lambda warming schedules
 */
export type PresetName = "business_hours" | "24/7" | "custom" | "off";

/**
 * Predefined schedule presets
 */
export const SCHEDULE_PRESETS: Record<PresetName, WeeklySchedule> = {
  business_hours: {
    monday: BUSINESS_HOURS_DAY,
    tuesday: BUSINESS_HOURS_DAY,
    wednesday: BUSINESS_HOURS_DAY,
    thursday: BUSINESS_HOURS_DAY,
    friday: BUSINESS_HOURS_DAY,
    saturday: DISABLED_DAY,
    sunday: DISABLED_DAY,
  },
  "24/7": {
    monday: FULL_DAY,
    tuesday: FULL_DAY,
    wednesday: FULL_DAY,
    thursday: FULL_DAY,
    friday: FULL_DAY,
    saturday: FULL_DAY,
    sunday: FULL_DAY,
  },
  off: {
    monday: DISABLED_DAY,
    tuesday: DISABLED_DAY,
    wednesday: DISABLED_DAY,
    thursday: DISABLED_DAY,
    friday: DISABLED_DAY,
    saturday: DISABLED_DAY,
    sunday: DISABLED_DAY,
  },
  custom: {
    // Custom starts as business hours, user can modify
    monday: BUSINESS_HOURS_DAY,
    tuesday: BUSINESS_HOURS_DAY,
    wednesday: BUSINESS_HOURS_DAY,
    thursday: BUSINESS_HOURS_DAY,
    friday: BUSINESS_HOURS_DAY,
    saturday: DISABLED_DAY,
    sunday: DISABLED_DAY,
  },
};

/**
 * Preset display information
 */
export const PRESET_INFO: Record<
  PresetName,
  { label: string; description: string; icon?: string }
> = {
  business_hours: {
    label: "Business Hours",
    description: "Mon-Fri, 9am-5pm",
    icon: "💼",
  },
  "24/7": {
    label: "24/7",
    description: "All days, all hours",
    icon: "🔄",
  },
  custom: {
    label: "Custom",
    description: "Configure your own schedule",
    icon: "⚙️",
  },
  off: {
    label: "Off",
    description: "No warming",
    icon: "⏸️",
  },
};

/**
 * List of all days of the week
 */
const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/**
 * Display names for days of the week
 */
export const DAY_DISPLAY_NAMES: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/**
 * Day abbreviations
 */
export const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/**
 * Apply a preset to get its schedule
 * 
 * @param preset - The preset name to apply
 * @returns A deep copy of the preset schedule
 */
export function applyPreset(preset: PresetName): WeeklySchedule {
  return cloneSchedule(SCHEDULE_PRESETS[preset]);
}

/**
 * Determine which preset matches the given schedule
 * 
 * @param schedule - The weekly schedule to check
 * @returns The matching preset name or "custom" if no match
 */
export function detectPreset(schedule: WeeklySchedule): PresetName {
  // Check each preset for exact match
  for (const [presetName, presetSchedule] of Object.entries(SCHEDULE_PRESETS)) {
    if (presetName === "custom") continue; // Skip custom for detection

    if (schedulesMatch(schedule, presetSchedule)) {
      return presetName as PresetName;
    }
  }

  // If no preset matches, it's custom
  return "custom";
}

/**
 * Check if two schedules are identical
 * 
 * @param s1 - First schedule
 * @param s2 - Second schedule
 * @returns True if schedules match
 */
function schedulesMatch(s1: WeeklySchedule, s2: WeeklySchedule): boolean {
  for (const day of DAYS_OF_WEEK) {
    const day1 = s1[day];
    const day2 = s2[day];

    // Check enabled status
    if (day1.enabled !== day2.enabled) return false;

    // If both disabled, continue
    if (!day1.enabled && !day2.enabled) continue;

    // Check ranges count
    if (day1.ranges.length !== day2.ranges.length) return false;

    // Check each range
    for (let i = 0; i < day1.ranges.length; i++) {
      if (
        day1.ranges[i].start !== day2.ranges[i].start ||
        day1.ranges[i].end !== day2.ranges[i].end
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create a deep copy of a schedule
 * 
 * @param schedule - Schedule to clone
 * @returns Deep copy of the schedule
 */
export function cloneSchedule(schedule: WeeklySchedule): WeeklySchedule {
  return JSON.parse(JSON.stringify(schedule));
}

/**
 * Validate a time string (HH:mm format)
 * 
 * @param time - Time string to validate
 * @returns True if valid HH:mm format
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate a time range
 * 
 * @param start - Start time (HH:mm)
 * @param end - End time (HH:mm)
 * @returns True if valid range (end after start)
 */
export function isValidTimeRange(start: string, end: string): boolean {
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) {
    return false;
  }

  // Convert to minutes for comparison
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // End must be after start (we don't support overnight ranges in UI)
  return endMinutes > startMinutes;
}

/**
 * Convert HH:mm time to minutes since midnight
 * 
 * @param time - Time in HH:mm format
 * @returns Minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:mm format
 * 
 * @param minutes - Minutes since midnight
 * @returns Time in HH:mm format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Calculate total hours per week in a schedule
 * 
 * @param schedule - Weekly schedule
 * @returns Total hours per week
 */
export function calculateWeeklyHours(schedule: WeeklySchedule): number {
  let totalMinutes = 0;

  for (const day of DAYS_OF_WEEK) {
    const daySchedule = schedule[day];
    if (!daySchedule.enabled) continue;

    for (const range of daySchedule.ranges) {
      const startMinutes = timeToMinutes(range.start);
      const endMinutes = timeToMinutes(range.end);
      totalMinutes += endMinutes - startMinutes;
    }
  }

  return totalMinutes / 60; // Convert to hours
}
