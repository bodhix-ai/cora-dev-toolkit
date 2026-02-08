/**
 * OrgWsAdmin Component
 *
 * Organization admin page for workspace statistics and management.
 * 
 * Features:
 * - All Workspaces Tab: Complete workspace list with bulk operations
 * - Analytics Tab: Workspace usage statistics and insights
 * - Settings Tab: Organization-level workspace settings
 * 
 * @routes
 * Routes - Organization Admin:
 * - GET /admin/org/ws/settings - Get org workspace settings
 * - PUT /admin/org/ws/settings - Update org workspace settings
 * - GET /admin/org/ws/analytics - Get workspace analytics for organization
 * - GET /admin/org/ws/workspaces - List all org workspaces (admin view)
 * - POST /admin/org/ws/workspaces/{wsId}/restore - Admin restore workspace
 * - DELETE /admin/org/ws/workspaces/{wsId} - Admin force delete workspace
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  MoreVert,
  Archive,
  Delete,
  Refresh,
  Warning,
  Add,
  NavigateNext,
} from "@mui/icons-material";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { createWorkspaceApiClient } from "../../lib/api";
import type {
  WorkspaceAnalytics,
  WorkspaceStats,
  Workspace,
  WorkspaceStatus,
} from "../../types";
import { STATUS_DISPLAY_NAMES } from "../../types";

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
      id={`org-admin-tabpanel-${index}`}
      aria-labelledby={`org-admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function OrgWsAdmin(): React.ReactElement {
  const { data: session } = useSession();
  const { profile, loading: userLoading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();
  const selectedOrgId = currentOrganization?.orgId;
  
  const [activeTab, setActiveTab] = useState(0);
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<WorkspaceStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Org-level settings state
  const [allowUserCreation, setAllowUserCreation] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [maxWorkspacesPerUser, setMaxWorkspacesPerUser] = useState(10);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Show loading state while user profile is being fetched
  if (userLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
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

  // Check if user has org admin role
  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  // Require organization context
  if (!selectedOrgId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select an organization to manage workspaces.
        </Alert>
      </Box>
    );
  }

  // Fetch org settings
  const fetchOrgSettings = async () => {
    if (!session?.accessToken) return;

    setSettingsLoading(true);
    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const settings = await client.getOrgSettings(selectedOrgId);
      if (settings) {
        setAllowUserCreation(settings.allowUserCreation);
        setRequireApproval(settings.requireApproval);
        setMaxWorkspacesPerUser(settings.maxWorkspacesPerUser);
      }
    } catch (err) {
      console.error("Failed to fetch org settings:", err);
      // Use defaults if fetch fails (settings may not exist yet)
    } finally {
      setSettingsLoading(false);
    }
  };

  // Save org settings
  const handleSaveSettings = async () => {
    if (!session?.accessToken) return;

    setSettingsSaving(true);
    setSettingsSuccess(null);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      await client.updateOrgSettings(selectedOrgId, {
        allowUserCreation: allowUserCreation,
        requireApproval: requireApproval,
        maxWorkspacesPerUser: maxWorkspacesPerUser,
      });
      setSettingsSuccess("Settings saved successfully!");
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save org settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const data = await client.getAnalytics(selectedOrgId);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all workspaces (including archived)
  const fetchWorkspaces = async () => {
    console.log("[OrgWsAdmin] fetchWorkspaces called", { 
      hasAccessToken: !!session?.accessToken, 
      selectedOrgId 
    });
    
    if (!session?.accessToken) {
      console.warn("[OrgWsAdmin] No access token, aborting fetch");
      return;
    }

    setWorkspacesLoading(true);
    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const result = await client.listWorkspaces({
        orgId: selectedOrgId,
        status: "all" as any, // Get all statuses (active, archived, deleted)
        limit: 1000,
      });
      
      console.log("[OrgWsAdmin] listWorkspaces result:", {
        workspacesCount: result.workspaces?.length || 0,
        workspaces: result.workspaces,
        total: result.total
      });
      
      setWorkspaces(result.workspaces);
    } catch (err) {
      console.error("[OrgWsAdmin] Failed to fetch workspaces:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setWorkspacesLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchWorkspaces();
    fetchOrgSettings();
  }, [session?.accessToken, selectedOrgId]);

  const handleRefresh = () => {
    fetchAnalytics();
    fetchWorkspaces();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(workspaces.map((ws) => ws.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((wsId) => wsId !== id));
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    workspace: Workspace
  ) => {
    setMenuAnchor(event.currentTarget);
    setSelectedWorkspace(workspace);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedWorkspace(null);
  };

  const handleArchiveOne = async () => {
    if (!selectedWorkspace || !session?.accessToken) return;

    handleMenuClose();

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const newStatus: WorkspaceStatus =
        selectedWorkspace.status === "active" ? "archived" : "active";
      await client.updateWorkspace(selectedWorkspace.id, { status: newStatus }, selectedOrgId);
      fetchWorkspaces();
      fetchAnalytics();
    } catch (err) {
      console.error("Failed to update workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to update workspace");
    }
  };

  const handleDeleteOne = async () => {
    if (!selectedWorkspace || !session?.accessToken) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedWorkspace.name}"? This action cannot be undone.`
    );
    if (!confirmed) {
      handleMenuClose();
      return;
    }

    handleMenuClose();

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      await client.deleteWorkspace(selectedWorkspace.id, selectedOrgId);
      fetchWorkspaces();
      fetchAnalytics();
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0 || !session?.accessToken) return;

    const confirmed = window.confirm(
      `Archive ${selectedIds.length} workspaces? Users will no longer be able to access them.`
    );
    if (!confirmed) return;

    setBulkActionLoading(true);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      await Promise.all(
        selectedIds.map((id) =>
          client.updateWorkspace(id, { status: "archived" }, selectedOrgId)
        )
      );
      setSelectedIds([]);
      fetchWorkspaces();
      fetchAnalytics();
    } catch (err) {
      console.error("Failed to bulk archive:", err);
      setError(err instanceof Error ? err.message : "Failed to archive workspaces");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !session?.accessToken) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} workspaces? This action cannot be undone.`
    );
    if (!confirmed) return;

    setBulkActionLoading(true);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      await Promise.all(selectedIds.map((id) => client.deleteWorkspace(id, selectedOrgId)));
      setSelectedIds([]);
      fetchWorkspaces();
      fetchAnalytics();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      setError(err instanceof Error ? err.message : "Failed to delete workspaces");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filter workspaces by status and search query
  const filteredWorkspaces = workspaces.filter((ws) => {
    // Status filter
    if (statusFilter !== "all" && ws.status !== statusFilter) {
      return false;
    }
    
    // Search filter (matches workspace name or tags)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = ws.name.toLowerCase().includes(query);
      const matchesTags = ws.tags.some(tag => tag.toLowerCase().includes(query));
      return matchesName || matchesTags;
    }
    
    return true;
  });

  const getStatusChipColor = (
    status: WorkspaceStatus
  ): "success" | "default" | "warning" => {
    switch (status) {
      case "active":
        return "success";
      case "archived":
        return "warning";  // Orange to match user workspace page
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Link href="/admin/org" style={{ textDecoration: "none" }} aria-label="Go to Org Admin">
            <Typography 
              variant="body2" 
              color="primary" 
              sx={{ 
                "&:hover": { textDecoration: "underline" },
                cursor: "pointer"
              }}
            >
              Org Admin
            </Typography>
          </Link>
          <NavigateNext fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            WS
          </Typography>
        </Box>
      </Box>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Workspace Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage workspaces, view analytics, and configure organization settings
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="Organization admin tabs"
        >
          <Tab label="All Workspaces" id="org-admin-tab-0" />
          <Tab label="Analytics" id="org-admin-tab-1" />
          <Tab label="Settings" id="org-admin-tab-2" />
        </Tabs>
      </Paper>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Panels */}
      {!loading && (
        <>
          {/* All Workspaces Tab */}
          <TabPanel value={activeTab} index={0}>
            {/* Filters */}
            <Box sx={{ mb: 3 }}>
              {/* Search by name */}
              <TextField
                fullWidth
                size="small"
                placeholder="Search workspaces by name or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                aria-label="Search workspaces by name or tags"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">🔍</Typography>
                    </Box>
                  ),
                }}
              />
              
              {/* Status Filter */}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  label={`All (${workspaces.length})`}
                  color={statusFilter === "all" ? "primary" : "default"}
                  onClick={() => setStatusFilter("all")}
                  sx={{ cursor: "pointer" }}
                />
                <Chip
                  label={`Active (${workspaces.filter(ws => ws.status === "active").length})`}
                  color={statusFilter === "active" ? "primary" : "default"}
                  onClick={() => setStatusFilter("active")}
                  sx={{ cursor: "pointer" }}
                />
                <Chip
                  label={`Archived (${workspaces.filter(ws => ws.status === "archived").length})`}
                  color={statusFilter === "archived" ? "primary" : "default"}
                  onClick={() => setStatusFilter("archived")}
                  sx={{ cursor: "pointer" }}
                />
              </Box>
            </Box>

            {workspacesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredWorkspaces.length > 0 ? (
              <Paper>
                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "action.selected",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2">
                      {selectedIds.length} of {filteredWorkspaces.length} workspace(s) selected
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<Archive />}
                        onClick={handleBulkArchive}
                        disabled={bulkActionLoading}
                      >
                        Archive
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleBulkDelete}
                        disabled={bulkActionLoading}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                )}

                {bulkActionLoading && <LinearProgress />}

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={filteredWorkspaces.length > 0 && selectedIds.length === filteredWorkspaces.length}
                            indeterminate={
                              selectedIds.length > 0 &&
                              selectedIds.length < filteredWorkspaces.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(filteredWorkspaces.map((ws) => ws.id));
                              } else {
                                setSelectedIds([]);
                              }
                            }}
                            aria-label="Select all workspaces"
                          />
                        </TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Tags</TableCell>
                        <TableCell>Members</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Updated</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredWorkspaces.map((workspace) => (
                        <TableRow
                          key={workspace.id}
                          hover
                          selected={selectedIds.includes(workspace.id)}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedIds.includes(workspace.id)}
                              onChange={(e) =>
                                handleSelectOne(workspace.id, e.target.checked)
                              }
                              aria-label={`Select ${workspace.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  bgcolor: workspace.color,
                                }}
                              />
                              <Typography variant="body2">{workspace.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={STATUS_DISPLAY_NAMES[workspace.status]}
                              color={getStatusChipColor(workspace.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {workspace.tags.slice(0, 3).map((tag) => (
                                <Chip key={tag} label={tag} size="small" variant="outlined" />
                              ))}
                              {workspace.tags.length > 3 && (
                                <Chip
                                  label={`+${workspace.tags.length - 3}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{workspace.memberCount || 0}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(workspace.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(workspace.updatedAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, workspace)}
                              aria-label="Workspace actions"
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : workspaces.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: "center" }}>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No workspaces found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Workspaces created by organization members will appear here
                </Typography>
              </Paper>
            ) : (
              <Paper sx={{ p: 6, textAlign: "center" }}>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No {statusFilter} workspaces
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try selecting a different status filter
                </Typography>
              </Paper>
            )}
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={activeTab} index={1}>
            {analytics ? (
              <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Total Workspaces
                        </Typography>
                        <Typography variant="h4">
                          {analytics.totalWorkspaces ?? analytics.stats?.total ?? 0}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {analytics.activeWorkspaces ?? analytics.stats?.active ?? 0} active
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Active Workspaces
                        </Typography>
                        <Typography variant="h4">
                          {analytics.activeWorkspaces ?? analytics.stats?.active ?? 0}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                          <Typography variant="body2" color="success.main">
                            {(() => {
                              const total = analytics.totalWorkspaces ?? analytics.stats?.total ?? 0;
                              const active = analytics.activeWorkspaces ?? analytics.stats?.active ?? 0;
                              return total > 0 ? Math.round((active / total) * 100) : 0;
                            })()}
                            % of total
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Archived
                        </Typography>
                        <Typography variant="h4">
                          {analytics.archivedWorkspaces ?? analytics.stats?.archived ?? 0}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Available for restore
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Total Members
                        </Typography>
                        <Typography variant="h4">
                          {analytics.totalMembers ?? analytics.stats?.createdThisMonth ?? 0}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Avg {analytics.avgMembersPerWorkspace?.toFixed(1) ?? "0"} per workspace
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Inactive Workspaces Warning */}
                {analytics.inactiveWorkspaces && analytics.inactiveWorkspaces.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Inactive Workspaces Detected:</strong> {analytics.inactiveWorkspaces.length} workspace(s) have been inactive for 90+ days
                    </Typography>
                    <Typography variant="caption" display="block">
                      Consider archiving or reviewing these workspaces to free up resources
                    </Typography>
                  </Alert>
                )}

                {/* Most Active Workspaces */}
                {analytics.mostActive && analytics.mostActive.length > 0 && (
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" gutterBottom>
                      Most Active Workspaces
                    </Typography>
                    <Grid container spacing={2}>
                      {analytics.mostActive.slice(0, 5).map((ws: { workspaceId: string; workspaceName: string; actionCount: number }) => (
                        <Grid item xs={12} sm={6} md={4} key={ws.workspaceId}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="body1" gutterBottom>
                                {ws.workspaceName}
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {ws.actionCount}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                actions this month
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}
              </>
            ) : (
              <Paper sx={{ p: 6, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  Analytics data is loading or not available.
                </Typography>
              </Paper>
            )}
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={activeTab} index={2}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Organization Workspace Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Configure workspace policies for your organization
              </Typography>
              <Divider sx={{ my: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowUserCreation}
                        onChange={(e) => setAllowUserCreation(e.target.checked)}
                        aria-label="Allow user workspace creation"
                      />
                    }
                    label="Allow users to create workspaces"
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                    When enabled, all organization members can create workspaces
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={requireApproval}
                        onChange={(e) => setRequireApproval(e.target.checked)}
                        disabled={!allowUserCreation}
                        aria-label="Require workspace approval"
                      />
                    }
                    label="Require admin approval for new workspaces"
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                    New workspaces will need admin approval before becoming active
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Workspaces Per User"
                    value={maxWorkspacesPerUser}
                    onChange={(e) => setMaxWorkspacesPerUser(parseInt(e.target.value) || 10)}
                    helperText="Maximum number of workspaces a user can own"
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Grid>

                {settingsSuccess && (
                  <Grid item xs={12}>
                    <Alert severity="success" onClose={() => setSettingsSuccess(null)}>
                      {settingsSuccess}
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                    <Button 
                      variant="outlined" 
                      onClick={fetchOrgSettings}
                      disabled={settingsLoading || settingsSaving}
                    >
                      Reset
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleSaveSettings}
                      disabled={settingsLoading || settingsSaving}
                    >
                      {settingsSaving ? "Saving..." : "Save Settings"}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleArchiveOne}>
          <Archive fontSize="small" sx={{ mr: 1 }} />
          {selectedWorkspace?.status === "active" ? "Archive" : "Restore"}
        </MenuItem>
        <MenuItem onClick={handleDeleteOne} sx={{ color: "error.main" }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Container>
  );
}

export default OrgWsAdmin;
