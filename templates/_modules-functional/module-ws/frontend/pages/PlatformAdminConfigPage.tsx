/**
 * PlatformAdminConfigPage Component
 *
 * Platform admin page for managing workspace module configuration.
 * Controls navigation labels, feature flags, and default settings.
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  InputAdornment,
} from "@mui/material";
import { Save, Refresh } from "@mui/icons-material";
import { useWorkspaceConfig } from "../hooks/useWorkspaceConfig";
import { ColorPicker } from "../components/ColorPicker";
import { WORKSPACE_COLORS } from "../types";
import type { WorkspaceConfig } from "../types";

export interface PlatformAdminConfigPageProps {
  /** Whether user has platform admin permissions */
  isPlatformAdmin?: boolean;
  /** Callback when configuration is saved */
  onSaveSuccess?: (config: WorkspaceConfig) => void;
}

export function PlatformAdminConfigPage({
  isPlatformAdmin = true,
  onSaveSuccess,
}: PlatformAdminConfigPageProps): React.ReactElement {
  const {
    config,
    loading,
    error,
    updateConfig,
    isSaving,
    refetch,
  } = useWorkspaceConfig();

  // Form state
  const [navLabelSingular, setNavLabelSingular] = useState("");
  const [navLabelPlural, setNavLabelPlural] = useState("");
  const [navIcon, setNavIcon] = useState("");
  const [enableFavorites, setEnableFavorites] = useState(true);
  const [enableTags, setEnableTags] = useState(true);
  const [enableColorCoding, setEnableColorCoding] = useState(true);
  const [defaultColor, setDefaultColor] = useState("#1976d2");
  const [defaultRetentionDays, setDefaultRetentionDays] = useState(30);
  const [maxTagsPerWorkspace, setMaxTagsPerWorkspace] = useState(10);
  const [maxTagLength, setMaxTagLength] = useState(20);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from config
  useEffect(() => {
    if (config) {
      setNavLabelSingular(config.nav_label_singular);
      setNavLabelPlural(config.nav_label_plural);
      setNavIcon(config.nav_icon);
      setEnableFavorites(config.enable_favorites);
      setEnableTags(config.enable_tags);
      setEnableColorCoding(config.enable_color_coding);
      setDefaultColor(config.default_color);
      setDefaultRetentionDays(config.default_retention_days);
      setMaxTagsPerWorkspace(config.max_tags_per_workspace);
      setMaxTagLength(config.max_tag_length);
    }
  }, [config]);

  // Track changes
  useEffect(() => {
    if (!config) {
      setHasChanges(false);
      return;
    }

    const changed =
      navLabelSingular !== config.nav_label_singular ||
      navLabelPlural !== config.nav_label_plural ||
      navIcon !== config.nav_icon ||
      enableFavorites !== config.enable_favorites ||
      enableTags !== config.enable_tags ||
      enableColorCoding !== config.enable_color_coding ||
      defaultColor !== config.default_color ||
      defaultRetentionDays !== config.default_retention_days ||
      maxTagsPerWorkspace !== config.max_tags_per_workspace ||
      maxTagLength !== config.max_tag_length;

    setHasChanges(changed);
  }, [
    config,
    navLabelSingular,
    navLabelPlural,
    navIcon,
    enableFavorites,
    enableTags,
    enableColorCoding,
    defaultColor,
    defaultRetentionDays,
    maxTagsPerWorkspace,
    maxTagLength,
  ]);

  const handleSave = async () => {
    if (!config) return;

    setSaveSuccess(false);

    try {
      const updated = await updateConfig({
        nav_label_singular: navLabelSingular,
        nav_label_plural: navLabelPlural,
        nav_icon: navIcon,
        enable_favorites: enableFavorites,
        enable_tags: enableTags,
        enable_color_coding: enableColorCoding,
        default_color: defaultColor,
        default_retention_days: defaultRetentionDays,
        max_tags_per_workspace: maxTagsPerWorkspace,
        max_tag_length: maxTagLength,
      });

      if (updated) {
        setSaveSuccess(true);
        onSaveSuccess?.(updated);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save configuration:", err);
    }
  };

  const handleReset = () => {
    if (config) {
      setNavLabelSingular(config.nav_label_singular);
      setNavLabelPlural(config.nav_label_plural);
      setNavIcon(config.nav_icon);
      setEnableFavorites(config.enable_favorites);
      setEnableTags(config.enable_tags);
      setEnableColorCoding(config.enable_color_coding);
      setDefaultColor(config.default_color);
      setDefaultRetentionDays(config.default_retention_days);
      setMaxTagsPerWorkspace(config.max_tags_per_workspace);
      setMaxTagLength(config.max_tag_length);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access this page. Platform admin role required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Workspace Module Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure workspace module settings, navigation labels, and feature flags
        </Typography>
      </Box>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Success alert */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configuration saved successfully!
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Configuration form */}
      {!loading && config && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={4}>
            {/* Navigation Settings */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Navigation Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Customize how this module appears in navigation
              </Typography>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Singular Label"
                value={navLabelSingular}
                onChange={(e) => setNavLabelSingular(e.target.value)}
                helperText="How a single item is referred to (e.g., 'Project', 'Team')"
                disabled={isSaving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Plural Label"
                value={navLabelPlural}
                onChange={(e) => setNavLabelPlural(e.target.value)}
                helperText="How multiple items are referred to (e.g., 'Projects', 'Teams')"
                disabled={isSaving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Navigation Icon"
                value={navIcon}
                onChange={(e) => setNavIcon(e.target.value)}
                helperText="Material-UI icon name (e.g., 'Workspaces', 'Folder')"
                disabled={isSaving}
              />
            </Grid>

            {/* Feature Flags */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Feature Flags
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enable or disable workspace features
              </Typography>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableFavorites}
                    onChange={(e) => setEnableFavorites(e.target.checked)}
                    disabled={isSaving}
                    aria-label="Enable favorites feature"
                  />
                }
                label="Enable Favorites"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Allow users to favorite workspaces
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableTags}
                    onChange={(e) => setEnableTags(e.target.checked)}
                    disabled={isSaving}
                    aria-label="Enable tags feature"
                  />
                }
                label="Enable Tags"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Allow tags on workspaces
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableColorCoding}
                    onChange={(e) => setEnableColorCoding(e.target.checked)}
                    disabled={isSaving}
                    aria-label="Enable color coding feature"
                  />
                }
                label="Enable Color Coding"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Allow custom colors for workspaces
              </Typography>
            </Grid>

            {/* Default Settings */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Default Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Default values for new workspaces
              </Typography>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Default Color
                </Typography>
                <ColorPicker
                  value={defaultColor}
                  onChange={setDefaultColor}
                  colors={WORKSPACE_COLORS}
                  disabled={isSaving || !enableColorCoding}
                />
                {!enableColorCoding && (
                  <Typography variant="caption" color="text.secondary">
                    Color coding is disabled
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Default Retention Days"
                value={defaultRetentionDays}
                onChange={(e) => setDefaultRetentionDays(parseInt(e.target.value) || 30)}
                helperText="Days to retain deleted workspaces before permanent deletion"
                disabled={isSaving}
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>

            {/* Tag Constraints */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Tag Constraints
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Limits for workspace tags
              </Typography>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Tags Per Workspace"
                value={maxTagsPerWorkspace}
                onChange={(e) => setMaxTagsPerWorkspace(parseInt(e.target.value) || 10)}
                helperText="Maximum number of tags allowed per workspace"
                disabled={isSaving || !enableTags}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Tag Length"
                value={maxTagLength}
                onChange={(e) => setMaxTagLength(parseInt(e.target.value) || 20)}
                helperText="Maximum characters per tag"
                disabled={isSaving || !enableTags}
                InputProps={{
                  endAdornment: <InputAdornment position="end">chars</InputAdornment>,
                }}
                inputProps={{ min: 3, max: 50 }}
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleReset}
                  disabled={!hasChanges || isSaving}
                >
                  Reset Changes
                </Button>
                <Button
                  variant="contained"
                  startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
}

export default PlatformAdminConfigPage;
