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
 * Platform Lambda configuration stored in platform_lambda_config table
 */
export interface LambdaConfig {
  id: string;
  config_key: string;
  config_value: ConfigValue;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Lambda warming configuration structure
 */
export interface LambdaWarmingConfig {
  enabled: boolean;
  timezone: string;
  interval_minutes: number;
  weekly_schedule: WeeklySchedule;
  lambda_functions: string[];
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
  memory_mb: number;
  timeout_seconds: number;
  runtime: string;
  last_modified: string;
  description?: string;
  handler: string;
  version?: string;
}

/**
 * EventBridge rule information
 */
export interface EventBridgeRule {
  name: string;
  state: "ENABLED" | "DISABLED";
  schedule_expression: string;
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
  rule_name: string;
  error_message: string;
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
  is_warming: boolean;
  last_warmed_at?: string;
  next_warm_at?: string;
  active_rules_count: number;
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
  interval_minutes: 5,
  weekly_schedule: {
    monday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    tuesday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    wednesday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    thursday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    friday: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    saturday: { enabled: false, ranges: [] },
    sunday: { enabled: false, ranges: [] },
  },
  lambda_functions: [],
};
