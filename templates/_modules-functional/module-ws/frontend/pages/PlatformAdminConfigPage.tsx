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

import React, { useState, useEffect, useCallback } from "react";
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
  Tooltip,
  IconButton,
} from "@mui/material";
import { Save, Refresh, TrendingUp, TrendingDown, NavigateNext } from "@mui/icons-material";
import * as MuiIcons from "@mui/icons-material";
import Link from "next/link";
import { useWorkspaceConfig } from "../hooks/useWorkspaceConfig";
import { ColorPicker } from "../components/ColorPicker";
import { WORKSPACE_COLORS } from "../types";
import type { WorkspaceConfig } from "../types";
import { useSession } from "next-auth/react";
import { createWorkspaceApiClient } from "../lib/api";

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

  // Platform analytics state
  const { data: session } = useSession();
  const [platformStats, setPlatformStats] = useState<{
    totalWorkspaces: number;
    activeWorkspaces: number;
    archivedWorkspaces: number;
    createdThisMonth: number;
    organizationStats: Array<{
      org_id: string;
      total: number;
      active: number;
      archived: number;
      avg_per_user: number;
    }>;
    featureAdoption: {
      favorites_pct: number;
      tags_pct: number;
      colors_pct: number;
    };
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Fetch platform analytics
  const fetchAnalytics = useCallback(async () => {
    if (!session?.accessToken) return;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const apiClient = createWorkspaceApiClient(session.accessToken as string);
      const data = await apiClient.getSysAnalytics();
      if (data) {
        setPlatformStats(data);
      } else {
        setAnalyticsError("No analytics data available");
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setAnalyticsError("Failed to load platform analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [session?.accessToken]);

  // Fetch analytics when tab changes to Usage Summary
  useEffect(() => {
    if (activeTab === 1 && !platformStats && !analyticsLoading) {
      fetchAnalytics();
    }
  }, [activeTab, platformStats, analyticsLoading, fetchAnalytics]);

  // Icon picker options - common workspace-related icons
  const AVAILABLE_ICONS = [
    "Workspaces", "Folder", "FolderOpen", "Dashboard", "Assessment",
    "Business", "AccountTree", "Category", "ViewModule", "GridView",
    "Layers", "Storage", "Inventory", "Archive", "CollectionsBookmark"
  ];

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
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
        <Link href="/admin/sys" style={{ textDecoration: "none" }} aria-label="Go to Platform Admin">
          <Typography 
            variant="body2" 
            color="primary" 
            sx={{ 
              "&:hover": { textDecoration: "underline" },
              cursor: "pointer"
            }}
          >
            Platform Admin
          </Typography>
        </Link>
        <NavigateNext fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Workspace Configuration
        </Typography>
      </Box>

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
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Navigation Icon
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
                      {AVAILABLE_ICONS.map((iconName) => {
                        const IconComponent = (MuiIcons as Record<string, React.ComponentType<{ fontSize?: string }>>)[iconName];
                        if (!IconComponent) return null;
                        return (
                          <Tooltip key={iconName} title={iconName}>
                            <IconButton
                              onClick={() => setNavIcon(iconName)}
                              disabled={isSaving}
                              aria-label={`Select ${iconName} icon`}
                              sx={{
                                border: navIcon === iconName ? 2 : 1,
                                borderColor: navIcon === iconName ? "primary.main" : "divider",
                                bgcolor: navIcon === iconName ? "primary.light" : "transparent",
                                "&:hover": { bgcolor: "action.hover" },
                              }}
                            >
                              <IconComponent fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        );
                      })}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Selected: {navIcon || "None"}
                    </Typography>
                  </Box>
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
            {analyticsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : analyticsError ? (
              <Alert 
                severity="error" 
                action={
                  <Button color="inherit" size="small" onClick={fetchAnalytics}>
                    Retry
                  </Button>
                }
              >
                {analyticsError}
              </Alert>
            ) : !platformStats ? (
              <Alert severity="info">
                No analytics data available. Click the Usage Summary tab to load data.
              </Alert>
            ) : (
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
                      {platformStats.totalWorkspaces > 0 
                        ? Math.round((platformStats.activeWorkspaces / platformStats.totalWorkspaces) * 100) 
                        : 0}% of total
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
                          <TableCell>Organization ID</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Active</TableCell>
                          <TableCell align="right">Archived</TableCell>
                          <TableCell align="right">Avg/User</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {platformStats.organizationStats.map((org) => (
                          <TableRow key={org.org_id}>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                              {org.org_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell align="right">{org.total}</TableCell>
                            <TableCell align="right">{org.active}</TableCell>
                            <TableCell align="right">{org.archived}</TableCell>
                            <TableCell align="right">{org.avg_per_user.toFixed(1)}</TableCell>
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
                          {platformStats.featureAdoption.favorites_pct}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%", bgcolor: "action.hover", borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${platformStats.featureAdoption.favorites_pct}%`,
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
                          {platformStats.featureAdoption.tags_pct}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%", bgcolor: "action.hover", borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${platformStats.featureAdoption.tags_pct}%`,
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
                          {platformStats.featureAdoption.colors_pct}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%", bgcolor: "action.hover", borderRadius: 1, height: 8 }}>
                        <Box
                          sx={{
                            width: `${platformStats.featureAdoption.colors_pct}%`,
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
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Refresh Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Platform analytics are fetched from cross-organization workspace data.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchAnalytics}
                    disabled={analyticsLoading}
                  >
                    {analyticsLoading ? "Loading..." : "Refresh Analytics"}
                  </Button>
                </Paper>
              </Grid>
            </Grid>
            )}
          </TabPanel>
        </>
      )}
    </Container>
  );
}

export default PlatformAdminConfigPage;
