/**
 * Schedule Tab Component
 *
 * Lambda warming schedule management tab with enhanced visual schedule editor.
 * Allows platform admins to configure Lambda function warming schedules.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useLambdaWarming } from "../../hooks/useLambdaWarming";
import { useUser } from "@ai-sec/module-access";
import type { DayName, DaySchedule, LambdaWarmingConfig, WeeklySchedule } from "../../types";
import { DEFAULT_WARMING_CONFIG } from "../../types";
import SchedulePresets from "./schedule/SchedulePresets";
import TimezoneSelector from "./schedule/TimezoneSelector";
import WeeklyScheduleVisualizer from "./schedule/WeeklyScheduleVisualizer";
import DayScheduleEditor from "./schedule/DayScheduleEditor";
import CostCalculator from "./schedule/CostCalculator";
import {
  detectPreset,
  applyPreset,
  type PresetName,
} from "../../utils/schedulePresets";

/**
 * Schedule Tab - Enhanced Lambda Warming Management
 *
 * Provides comprehensive UI for managing Lambda warming configuration:
 * - Enable/disable warming
 * - Schedule presets (Business Hours, 24/7, Custom, Off)
 * - Visual weekly schedule editor
 * - Timezone selection
 * - Cost estimation
 *
 * @example
 * ```tsx
 * <ScheduleTab />
 * ```
 */
export function ScheduleTab(): React.ReactElement {
  const { authAdapter } = useUser();
  const { config, loading, saving, error, updateConfig, toggleEnabled } =
    useLambdaWarming(authAdapter);

  // Local state for schedule editing
  const [localSchedule, setLocalSchedule] = useState<WeeklySchedule>(
    DEFAULT_WARMING_CONFIG.weekly_schedule
  );
  const [localTimezone, setLocalTimezone] = useState<string>(
    DEFAULT_WARMING_CONFIG.timezone
  );
  const [localIntervalMinutes, setLocalIntervalMinutes] = useState<number>(
    DEFAULT_WARMING_CONFIG.interval_minutes
  );

  // Modal state for day editing
  const [editingDay, setEditingDay] = useState<DayName | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Sync local state with config when it changes
  useEffect(() => {
    if (config) {
      setLocalSchedule(
        config.weekly_schedule || DEFAULT_WARMING_CONFIG.weekly_schedule
      );
      setLocalTimezone(config.timezone || DEFAULT_WARMING_CONFIG.timezone);
      setLocalIntervalMinutes(
        config.interval_minutes || DEFAULT_WARMING_CONFIG.interval_minutes
      );
    }
  }, [config]);

  // Detect current preset
  const currentPreset = detectPreset(localSchedule);

  // Check if there are unsaved changes
  const hasChanges = React.useMemo(() => {
    if (!config) return false;
    return (
      JSON.stringify(localSchedule) !==
        JSON.stringify(
          config.weekly_schedule || DEFAULT_WARMING_CONFIG.weekly_schedule
        ) ||
      localTimezone !== (config.timezone || DEFAULT_WARMING_CONFIG.timezone) ||
      localIntervalMinutes !==
        (config.interval_minutes || DEFAULT_WARMING_CONFIG.interval_minutes)
    );
  }, [config, localSchedule, localTimezone, localIntervalMinutes]);

  /**
   * Handle preset selection
   */
  const handlePresetChange = useCallback((preset: PresetName) => {
    const newSchedule = applyPreset(preset);
    setLocalSchedule(newSchedule);
  }, []);

  /**
   * Handle timezone change
   */
  const handleTimezoneChange = useCallback((timezone: string) => {
    setLocalTimezone(timezone);
  }, []);

  /**
   * Handle opening day editor
   */
  const handleEditDay = useCallback((day: DayName) => {
    setEditingDay(day);
    setEditorOpen(true);
  }, []);

  /**
   * Handle saving day schedule changes
   */
  const handleSaveDaySchedule = useCallback(
    (days: DayName[], schedule: DaySchedule) => {
      const newSchedule = { ...localSchedule };
      days.forEach((day) => {
        newSchedule[day] = schedule;
      });
      setLocalSchedule(newSchedule);
      setEditorOpen(false);
    },
    [localSchedule]
  );

  /**
   * Handle saving all changes
   */
  const handleSave = async () => {
    if (!config) return;

    const newConfig: LambdaWarmingConfig = {
      ...config,
      weekly_schedule: localSchedule,
      timezone: localTimezone,
      interval_minutes: localIntervalMinutes,
      preset: currentPreset,
    };

    await updateConfig(newConfig);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Lambda Warming Schedule
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure automatic Lambda function warming to reduce cold starts and
        improve response times.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Enable/Disable Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={config?.enabled || false}
                onChange={(e) => toggleEnabled(e.target.checked)}
                disabled={saving}
                aria-label="Enable Lambda warming"
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1">Enable Lambda Warming</Typography>
                <Typography variant="body2" color="text.secondary">
                  {config?.enabled
                    ? "Warming is active - Lambda functions will be kept warm according to schedule"
                    : "Warming is disabled - No warming invocations will occur"}
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 3 }} />

          {/* Schedule Presets */}
          <Box sx={{ mb: 3 }}>
            <SchedulePresets
              selectedPreset={currentPreset}
              onPresetChange={handlePresetChange}
              disabled={!config?.enabled || saving}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Timezone Selector */}
          <Box sx={{ mb: 3 }}>
            <TimezoneSelector
              timezone={localTimezone}
              onTimezoneChange={handleTimezoneChange}
              disabled={!config?.enabled || saving}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Weekly Schedule Visualizer */}
          <Box sx={{ mb: 3 }}>
            <WeeklyScheduleVisualizer
              schedule={localSchedule}
              onEditDay={handleEditDay}
              disabled={!config?.enabled || saving}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Cost Calculator */}
          <Box sx={{ mb: 3 }}>
            <CostCalculator
              schedule={localSchedule}
              intervalMinutes={localIntervalMinutes}
              enabled={config?.enabled || false}
            />
          </Box>

          {/* Save Button */}
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!config?.enabled || saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
            {hasChanges && (
              <Button
                variant="outlined"
                onClick={() => {
                  if (config) {
                    setLocalSchedule(
                      config.weekly_schedule ||
                        DEFAULT_WARMING_CONFIG.weekly_schedule
                    );
                    setLocalTimezone(
                      config.timezone || DEFAULT_WARMING_CONFIG.timezone
                    );
                    setLocalIntervalMinutes(
                      config.interval_minutes ||
                        DEFAULT_WARMING_CONFIG.interval_minutes
                    );
                  }
                }}
                disabled={saving}
              >
                Reset Changes
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Day Schedule Editor Modal */}
      {editingDay && (
        <DayScheduleEditor
          day={editingDay}
          schedule={localSchedule[editingDay]}
          timezone={localTimezone}
          onSave={handleSaveDaySchedule}
          onClose={() => setEditorOpen(false)}
          open={editorOpen}
        />
      )}

      {/* Help Text */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Lambda warming helps reduce cold start latency
          by keeping functions warm. The schedule determines which days and
          times warming occurs. All times are in the selected timezone. Changes
          to the schedule will be applied to EventBridge rules when you save.
        </Typography>
      </Box>
    </Box>
  );
}

export default ScheduleTab;
