/**
 * Lambda Management Module - TypeScript Type Definitions
 *
 * This file defines all TypeScript interfaces and types used in the
 * Lambda Management Module frontend.
 */

/**
 * Configuration value type - supports JSON-serializable values
 */
export type ConfigValue = 
  | string 
  | number 
  | boolean 
  | null 
  | ConfigValue[] 
  | { [key: string]: ConfigValue };

/**
 * Platform Lambda configuration stored in sys_lambda_config table
 */
export interface LambdaConfig {
  id: string;
  configKey: string;
  configValue: ConfigValue;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Lambda warming configuration structure
 */
export interface LambdaWarmingConfig {
  enabled: boolean;
  timezone: string;
  intervalMinutes: number;
  weeklySchedule: WeeklySchedule;
  lambdaFunctions: string[];
  preset?: string; // Optional preset name (e.g., "business_hours", "24/7", "custom", "off")
}

/**
 * Weekly schedule structure (7 days)
 */
export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Single day schedule configuration
 */
export interface DaySchedule {
  enabled: boolean;
  ranges: TimeRange[];
}

/**
 * Time range for warming (e.g., "09:00" to "17:00")
 */
export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

/**
 * AWS Lambda function information
 */
export interface LambdaFunctionInfo {
  name: string;
  arn: string;
  memoryMb: number;
  timeoutSeconds: number;
  runtime: string;
  lastModified: string;
  description?: string;
  handler?: string;
  version?: string;
}

/**
 * EventBridge rule information
 */
export interface EventBridgeRule {
  name: string;
  state: "ENABLED" | "DISABLED";
  scheduleExpression: string;
  description?: string;
  targets: EventBridgeTarget[];
}

/**
 * EventBridge rule target
 */
export interface EventBridgeTarget {
  id: string;
  arn: string;
  input?: string;
}

/**
 * EventBridge sync result
 */
export interface EventBridgeSyncResult {
  created: string[];
  updated: string[];
  deleted: string[];
  errors: SyncError[];
}

/**
 * Sync error details
 */
export interface SyncError {
  ruleName: string;
  errorMessage: string;
}

/**
 * API response format
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Lambda warming status
 */
export interface WarmingStatus {
  isWarming: boolean;
  lastWarmedAt?: string;
  nextWarmAt?: string;
  activeRulesCount: number;
}

/**
 * Day of week type
 */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/**
 * Alias for backward compatibility
 */
export type DayName = DayOfWeek;

/**
 * Array of all day names in week order
 */
export const DAY_NAMES: DayName[] = [
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
export const DAY_DISPLAY_NAMES: Record<DayName, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/**
 * Abbreviated day names
 */
export const DAY_ABBREVIATIONS: Record<DayName, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/**
 * Available timezones for warming schedule
 */
export const AVAILABLE_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export type Timezone = (typeof AVAILABLE_TIMEZONES)[number];

/**
 * Default warming configuration
 */
export const DEFAULT_WARMING_CONFIG: LambdaWarmingConfig = {
  enabled: false,
  timezone: "America/New_York",
  intervalMinutes: 5,
  weeklySchedule: {
    monday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    tuesday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    wednesday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    thursday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    friday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    saturday: { enabled: false, ranges: [] },
    sunday: { enabled: false, ranges: [] },
  },
  lambdaFunctions: [],
};
