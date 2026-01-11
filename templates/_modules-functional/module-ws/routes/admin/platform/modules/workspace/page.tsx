"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { useSession } from "next-auth/react";
import { createWorkspaceApiClient } from "@{{PROJECT_NAME}}/module-ws";

/**
 * Platform Admin - Workspace Configuration Page
 * 
 * Allows platform administrators to configure workspace module behavior globally.
 * Features two tabs:
 * - Configuration: Navigation labels, icons, feature flags, defaults
 * - Usage Summary: Cross-org statistics and analytics
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

export default function WorkspaceConfigPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create API client with session token
  const apiClient = useMemo(() => {
    if (!session?.accessToken) return null;
    return createWorkspaceApiClient(session.accessToken as string);
  }, [session?.accessToken]);

  // Get org_id from session
  const orgId = session?.user?.org_id as string | undefined;

  // Load configuration on mount
  useEffect(() => {
    if (apiClient && orgId) {
      loadConfig();
    }
  }, [apiClient, orgId]);

  const loadConfig = async () => {
    if (!apiClient || !orgId) return;

    try {
      setLoading(true);
      setError(null);
      
      const configData = await apiClient.getConfig(orgId);
      setConfig(configData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !apiClient || !orgId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatedConfig = await apiClient.updateConfig({
        nav_label_singular: config.nav_label_singular,
        nav_label_plural: config.nav_label_plural,
        nav_icon: config.nav_icon,
        enable_favorites: config.enable_favorites,
        enable_tags: config.enable_tags,
        enable_color_coding: config.enable_color_coding,
        default_color: config.default_color,
      }, orgId);

      setConfig(updatedConfig);
      setSuccess("Configuration saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFieldChange = (field: keyof WorkspaceConfig, value: WorkspaceConfig[keyof WorkspaceConfig]) => {
    if (config) {
      setConfig({ ...config, [field]: value });
    }
  };

  if (loading) {
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
        Configure workspace module behavior, navigation labels, and feature flags for all organizations
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
          {config && (
            <Box sx={{ maxWidth: 800 }}>
              {/* Navigation Labels */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Navigation Labels
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    These labels appear in navigation, headers, and throughout the application.
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
                    helperText="Material UI icon name (e.g., WorkspaceIcon, FolderIcon)"
                  />
                </CardContent>
              </Card>

              {/* Features */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Features
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enable or disable workspace features globally
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
                    Defaults
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
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Configuration"}
                </Button>
              </Box>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Usage Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Cross-organization workspace usage statistics (Coming Soon)
            </Typography>
            <Alert severity="info">
              Usage analytics will be displayed here, including:
              <ul>
                <li>Total workspaces across all organizations</li>
                <li>Active vs archived workspaces</li>
                <li>Usage by organization</li>
                <li>Workspace growth trends</li>
                <li>Feature adoption metrics</li>
              </ul>
            </Alert>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
