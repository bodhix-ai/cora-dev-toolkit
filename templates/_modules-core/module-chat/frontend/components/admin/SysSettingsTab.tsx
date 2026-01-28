/**
 * System Settings Tab - Platform Chat Configuration
 *
 * Allows system admins to configure platform-wide chat settings including:
 * - Message retention policies
 * - Session timeout configuration
 * - Message length limits
 * - KB grounding limits
 * - Default AI provider/model
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { getSysAdminConfig, updateSysAdminConfig } from "../../lib/api";

interface ConfigState {
  messageRetentionDays: number;
  sessionTimeoutMinutes: number;
  maxMessageLength: number;
  maxKbGroundings: number;
  defaultAiProvider?: string;
  defaultAiModel?: string;
}

export function SysSettingsTab(): React.ReactElement {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigState>({
    messageRetentionDays: 90,
    sessionTimeoutMinutes: 30,
    maxMessageLength: 4000,
    maxKbGroundings: 5,
  });

  // Load current config
  useEffect(() => {
    if (!user) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const data = await getSysAdminConfig();
        setConfig({
          messageRetentionDays: data.messageRetentionDays,
          sessionTimeoutMinutes: data.sessionTimeoutMinutes,
          maxMessageLength: data.maxMessageLength,
          maxKbGroundings: data.maxKbGroundings,
          defaultAiProvider: data.defaultAiProvider,
          defaultAiModel: data.defaultAiModel,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load configuration");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateSysAdminConfig(config);
      setSuccess("Platform configuration updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update configuration");
    } finally {
      setSaving(false);
    }
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
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Platform Chat Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure platform-wide defaults for chat functionality. Organizations can override these settings.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Message Retention (days)"
                type="number"
                value={config.messageRetentionDays}
                onChange={(e) =>
                  setConfig({ ...config, messageRetentionDays: parseInt(e.target.value) || 0 })
                }
                helperText="How long to keep chat messages before deletion"
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Session Timeout (minutes)"
                type="number"
                value={config.sessionTimeoutMinutes}
                onChange={(e) =>
                  setConfig({ ...config, sessionTimeoutMinutes: parseInt(e.target.value) || 0 })
                }
                helperText="Idle time before session expires"
                inputProps={{ min: 5, max: 1440 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Message Length (characters)"
                type="number"
                value={config.maxMessageLength}
                onChange={(e) =>
                  setConfig({ ...config, maxMessageLength: parseInt(e.target.value) || 0 })
                }
                helperText="Maximum characters per message"
                inputProps={{ min: 100, max: 10000 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max KB Groundings"
                type="number"
                value={config.maxKbGroundings}
                onChange={(e) =>
                  setConfig({ ...config, maxKbGroundings: parseInt(e.target.value) || 0 })
                }
                helperText="Maximum knowledge bases per chat"
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default AI Provider"
                value={config.defaultAiProvider || ""}
                onChange={(e) =>
                  setConfig({ ...config, defaultAiProvider: e.target.value || undefined })
                }
                helperText="Default provider for chat AI (optional)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default AI Model"
                value={config.defaultAiModel || ""}
                onChange={(e) =>
                  setConfig({ ...config, defaultAiModel: e.target.value || undefined })
                }
                helperText="Default model for chat AI (optional)"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : undefined}
              >
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SysSettingsTab;