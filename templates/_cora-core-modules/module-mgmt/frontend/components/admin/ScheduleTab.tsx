/**
 * Schedule Tab Component
 *
 * Lambda warming schedule management tab.
 * Allows platform admins to configure Lambda function warming schedules.
 */

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useLambdaWarming } from "../../hooks/useLambdaWarming";
import { useUser } from "@ai-sec/module-access";

/**
 * Schedule Tab - Lambda Warming Management
 *
 * Provides UI for managing Lambda warming configuration:
 * - Enable/disable warming
 * - Configure warming schedule
 * - Set warming concurrency
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

  const [schedule, setSchedule] = React.useState(config?.schedule || "rate(5 minutes)");
  const [concurrency, setConcurrency] = React.useState(config?.concurrency || 1);

  React.useEffect(() => {
    if (config) {
      setSchedule(config.schedule || "rate(5 minutes)");
      setConcurrency(config.concurrency || 1);
    }
  }, [config]);

  // Check if there are unsaved changes to schedule or concurrency
  const hasChanges = React.useMemo(() => {
    if (!config) return false;
    return (
      schedule !== (config.schedule || "rate(5 minutes)") ||
      concurrency !== (config.concurrency || 1)
    );
  }, [config, schedule, concurrency]);

  const handleSave = async () => {
    if (!config) return;

    await updateConfig({
      ...config,
      schedule,
      concurrency,
    });
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
        Configure automatic Lambda function warming to reduce cold starts and improve response times.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={config?.enabled || false}
                onChange={(e) => toggleEnabled(e.target.checked)}
                disabled={saving}
                aria-label="Enable Lambda warming"
              />
            }
            label="Enable Lambda Warming"
          />

          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Warming Schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              disabled={!config?.enabled || saving}
              helperText="EventBridge schedule expression (e.g., rate(5 minutes) or cron(0/5 * * * ? *))"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="Concurrency"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              disabled={!config?.enabled || saving}
              helperText="Number of concurrent Lambda invocations for warming"
              inputProps={{ min: 1, max: 10 }}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!config?.enabled || saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Lambda warming helps reduce cold start latency by keeping functions warm.
          The schedule determines how frequently warming invocations occur. Higher concurrency can keep
          more Lambda instances warm but may increase costs.
        </Typography>
      </Box>
    </Box>
  );
}

export default ScheduleTab;
