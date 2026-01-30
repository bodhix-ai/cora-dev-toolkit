/**
 * Organization Settings Tab - Organization Chat Configuration
 *
 * Allows org admins to configure organization-specific chat settings:
 * - Message retention policies (overrides platform defaults)
 * - Message length limits
 * - KB grounding limits
 * - Sharing policies
 */

import React, { useState, useEffect } from "react";
import type { AuthAdapter } from "@{{PROJECT_NAME}}/module-access";
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
  FormControlLabel,
  Switch,
} from "@mui/material";
import { getOrgAdminConfig, updateOrgAdminConfig } from "../../lib/api";

interface ConfigState {
  messageRetentionDays: number;
  maxMessageLength: number;
  maxKbGroundings: number;
  usingPlatformDefaults: boolean;
}

interface OrgSettingsTabProps {
  authAdapter?: AuthAdapter;
}

/**
 * ✅ STANDARD PATTERN: Receives authAdapter as prop from parent
 * No individual useUser() call - follows KB admin pattern
 */
export function OrgSettingsTab({ authAdapter }: OrgSettingsTabProps): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigState>({
    messageRetentionDays: 90,
    maxMessageLength: 4000,
    maxKbGroundings: 5,
    usingPlatformDefaults: true,
  });

  // Load current config
  useEffect(() => {
    if (!authAdapter) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const data = await getOrgAdminConfig(authAdapter);
        setConfig({
          messageRetentionDays: data.messageRetentionDays,
          maxMessageLength: data.maxMessageLength,
          maxKbGroundings: data.maxKbGroundings,
          usingPlatformDefaults: data.usingPlatformDefaults,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load configuration");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [authAdapter]);

  const handleSave = async () => {
    if (!authAdapter) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateOrgAdminConfig(authAdapter, {
        messageRetentionDays: config.messageRetentionDays,
        maxMessageLength: config.maxMessageLength,
        maxKbGroundings: config.maxKbGroundings,
      });
      setSuccess("Organization configuration updated successfully");
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
            Organization Chat Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure organization-specific chat settings. These settings override platform defaults for your organization.
          </Typography>

          {config.usingPlatformDefaults && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Currently using platform default settings. You can override them below.
            </Alert>
          )}

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

export default OrgSettingsTab;