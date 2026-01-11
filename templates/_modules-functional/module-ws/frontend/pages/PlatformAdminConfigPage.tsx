/**
 * PlatformAdminConfigPage Component
 *
 * Platform admin page for managing workspace module configuration.
 * Controls navigation labels, feature flags, and default settings.
 * 
 * Features:
 * - Configuration Tab: Module settings and feature flags
 * - Usage Summary Tab: Cross-organization workspace statistics
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
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Save, Refresh, TrendingUp, TrendingDown } from "@mui/icons-material";
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
      id={`workspace-admin-tabpanel-${index}`}
      aria-labelledby={`workspace-admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
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

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

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

  // Mock platform-wide stats (TODO: Implement platform-wide analytics API)
  const platformStats = {
    totalWorkspaces: 1247,
    activeWorkspaces: 892,
    createdThisMonth: 156,
    organizationStats: [
      { org: "Acme Corp", total: 245, active: 180, avgPerUser: 3.2, trend: 12 },
      { org: "Global Industries", total: 189, active: 145, avgPerUser: 2.8, trend: 8 },
      { org: "TechStart Inc", total: 156, active: 134, avgPerUser: 4.1, trend: 15 },
      { org: "Enterprise Ltd", total: 142, active: 98, avgPerUser: 2.1, trend: -3 },
      { org: "StartupXYZ", total: 89, active: 72, avgPerUser: 5.2, trend: 22 },
    ],
    featureAdoption: {
      favorites: 78,
      tags: 62,
      colors: 54,
    },
  };

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
          Configure workspace module settings, navigation labels, and view platform-wide usage
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

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="Workspace admin tabs"
        >
          <Tab label="Configuration" id="workspace-admin-tab-0" />
          <Tab label="Usage Summary" id="workspace-admin-tab-1" />
        </Tabs>
      </Paper>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Panels */}
      {!loading && config && (
        <>
          {/* Configuration Tab */}
          <TabPanel value={activeTab} index={0}>
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
          </TabPanel>

          {/* Usage Summary Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              {/* Stats Cards */}
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Workspaces
                    </Typography>
                    <Typography variant="h4">{platformStats.totalWorkspaces.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Across all organizations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Active Workspaces
                    </Typography>
                    <Typography variant="h4">{platformStats.activeWorkspaces.toLocaleString()}</Typography>
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      {Math.round((platformStats.activeWorkspaces / platformStats.totalWorkspaces) * 100)}% of total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Created This Month
                    </Typography>
                    <Typography variant="h4">{platformStats.createdThisMonth}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}>
                      <TrendingUp fontSize="small" color="success" />
                      <Typography variant="body2" color="text.secondary">
                        Growth
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Usage by Organization */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    Usage by Organization
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Organization</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Active</TableCell>
                          <TableCell align="right">Avg/User</TableCell>
                          <TableCell align="right">Trend</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {platformStats.organizationStats.map((org) => (
                          <TableRow key={org.org}>
                            <TableCell>{org.org}</TableCell>
                            <TableCell align="right">{org.total}</TableCell>
                            <TableCell align="right">{org.active}</TableCell>
                            <TableCell align="right">{org.avgPerUser.toFixed(1)}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                                {org.trend > 0 ? (
                                  <TrendingUp fontSize="small" color="success" />
                                ) : (
                                  <TrendingDown fontSize="small" color="error" />
                                )}
                                <Typography
                                  variant="body2"
                                  color={org.trend > 0 ? "success.main" : "error.main"}
                                >
                                  {org.trend > 0 ? "+" : ""}{org.trend}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Feature Adoption */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Feature Adoption
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="body2">Favorites</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {platformStats.featureAdoption.favorites}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%", bgcolor: "action.hover", borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${platformStats.featureAdoption.favorites}%`,
                            bgcolor: "primary.main",
                            borderRadius: 1,
                            height: 8,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="body2">Tags</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {platformStats.featureAdoption.tags}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%", bgcolor: "action.hover", borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${platformStats.featureAdoption.tags}%`,
                            bgcolor: "primary.main",
                            borderRadius: 1,
                            height: 8,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="body2">Colors</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {platformStats.featureAdoption.colors}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%", bgcolor: "action.hover", borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${platformStats.featureAdoption.colors}%`,
                            bgcolor: "primary.main",
                            borderRadius: 1,
                            height: 8,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Alert severity="info">
                  <Typography variant="body2" gutterBottom>
                    <strong>Note:</strong> Platform-wide statistics are currently displaying mock data.
                  </Typography>
                  <Typography variant="caption">
                    Implement platform-wide analytics API endpoint to display real cross-organization data.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}
    </Container>
  );
}

export default PlatformAdminConfigPage;
