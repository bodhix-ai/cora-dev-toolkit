"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { createWorkspaceApiClient } from "@{{PROJECT_NAME}}/module-ws";

/**
 * System Admin - Workspace Configuration Page
 * 
 * Route: /admin/sys/ws
 * 
 * Allows platform administrators to configure workspace module behavior globally.
 * This is SYSTEM-LEVEL configuration that applies as defaults to all organizations.
 * 
 * Features two tabs:
 * - Configuration: Navigation labels, icons, feature flags, defaults
 * - Usage Summary: Cross-org statistics and analytics
 * 
 * Access: Platform admins only (platform_owner, platform_admin)
 * Note: This page does NOT require orgId - it manages platform-wide defaults
 */

interface WorkspaceConfig {
  id: string;
  nav_label_singular: string;
  nav_label_plural: string;
  nav_icon: string;
  enable_favorites: boolean;
  enable_tags: boolean;
  enable_color_coding: boolean;
  default_color: string;
  updated_at?: string;
  updated_by?: string;
}

// Default system configuration
const DEFAULT_CONFIG: WorkspaceConfig = {
  id: "system-default",
  nav_label_singular: "Workspace",
  nav_label_plural: "Workspaces",
  nav_icon: "Workspaces",
  enable_favorites: true,
  enable_tags: true,
  enable_color_coding: true,
  default_color: "#1976d2",
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workspace-config-tabpanel-${index}`}
      aria-labelledby={`workspace-config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function WorkspaceSystemConfigPage() {
  const { profile, loading: userLoading, isAuthenticated, authAdapter } = useUser();
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load system configuration on mount
  const loadConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      setError(null);
      
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Could not retrieve auth token");
        return;
      }
      
      // Call system-level config API endpoint (no orgId for platform-wide config)
      const apiClient = createWorkspaceApiClient(token);
      const configData = await apiClient.getConfig(); // No orgId = system default
      setConfig(configData || DEFAULT_CONFIG);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setConfigLoading(false);
    }
  }, [authAdapter]);

  // Load configuration when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !configLoading) {
      loadConfig();
    }
  }, [isAuthenticated, loadConfig]);

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await authAdapter.getToken();
      if (!token) {
        setError("Could not retrieve auth token");
        return;
      }
      
      // Call system-level config API endpoint
      const apiClient = createWorkspaceApiClient(token);
      await apiClient.updateConfig({
        nav_label_singular: config.nav_label_singular,
        nav_label_plural: config.nav_label_plural,
        nav_icon: config.nav_icon,
        enable_favorites: config.enable_favorites,
        enable_tags: config.enable_tags,
        enable_color_coding: config.enable_color_coding,
        default_color: config.default_color,
      }, ""); // Empty string for orgId = system-level config
      
      setSuccess("Configuration saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFieldChange = (field: keyof WorkspaceConfig, value: WorkspaceConfig[keyof WorkspaceConfig]) => {
    setConfig({ ...config, [field]: value });
  };

  // Show loading state while user profile is being fetched
  if (userLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Check if user has platform admin role
  const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
    profile.globalRole || ""
  );

  if (!isPlatformAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to platform administrators.
        </Alert>
      </Box>
    );
  }

  // Show loading state while config is being fetched
  if (configLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workspace Module Configuration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure platform-wide workspace module defaults. These settings apply to all organizations unless overridden at the organization level.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="workspace configuration tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Configuration" id="workspace-config-tab-0" aria-controls="workspace-config-tabpanel-0" />
          <Tab label="Usage Summary" id="workspace-config-tab-1" aria-controls="workspace-config-tabpanel-1" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ maxWidth: 800 }}>
            {/* Navigation Labels */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Navigation Labels
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Default labels that appear in navigation, headers, and throughout the application.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Singular Label"
                      value={config.nav_label_singular}
                      onChange={(e) => handleFieldChange("nav_label_singular", e.target.value)}
                      fullWidth
                      required
                      helperText="Example: Workspace, Audit, Campaign"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Plural Label"
                      value={config.nav_label_plural}
                      onChange={(e) => handleFieldChange("nav_label_plural", e.target.value)}
                      fullWidth
                      required
                      helperText="Example: Workspaces, Audits, Campaigns"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Navigation Icon */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Navigation Icon
                </Typography>
                <TextField
                  label="Icon Name"
                  value={config.nav_icon}
                  onChange={(e) => handleFieldChange("nav_icon", e.target.value)}
                  fullWidth
                  helperText="Material UI icon name (e.g., Workspaces, Folder, Dashboard)"
                />
              </CardContent>
            </Card>

            {/* Features */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Feature Defaults
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Default feature settings for all organizations. Organizations can override these settings.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enable_favorites}
                        onChange={(e) => handleFieldChange("enable_favorites", e.target.checked)}
                        inputProps={{ 'aria-label': 'Enable Favorites' }}
                      />
                    }
                    label="Enable Favorites"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1 }}>
                    Allow users to favorite workspaces for quick access
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enable_tags}
                        onChange={(e) => handleFieldChange("enable_tags", e.target.checked)}
                        inputProps={{ 'aria-label': 'Enable Tags' }}
                      />
                    }
                    label="Enable Tags"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1 }}>
                    Allow users to add tags for categorization
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enable_color_coding}
                        onChange={(e) => handleFieldChange("enable_color_coding", e.target.checked)}
                        inputProps={{ 'aria-label': 'Enable Color Coding' }}
                      />
                    }
                    label="Enable Color Coding"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                    Allow users to customize workspace colors
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Defaults */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Default Values
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    label="Default Color"
                    value={config.default_color}
                    onChange={(e) => handleFieldChange("default_color", e.target.value)}
                    helperText="Hex color format (#RRGGBB)"
                    sx={{ flexGrow: 1 }}
                  />
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      backgroundColor: config.default_color,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button onClick={loadConfig} disabled={saving}>
                Reset
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Platform Usage Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Cross-organization workspace statistics and analytics
            </Typography>
            <Alert severity="info">
              Platform-wide analytics will be displayed here, including:
              <ul>
                <li>Total workspaces across all organizations</li>
                <li>Active vs archived workspaces by organization</li>
                <li>Workspace creation trends</li>
                <li>Feature adoption metrics (favorites, tags, colors)</li>
                <li>Storage utilization by organization</li>
              </ul>
            </Alert>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
