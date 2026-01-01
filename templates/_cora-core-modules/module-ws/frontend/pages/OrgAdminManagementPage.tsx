/**
 * OrgAdminManagementPage Component
 *
 * Organization admin page for workspace statistics and management.
 * Shows analytics, workspace table, and bulk operations.
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
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  MoreVert,
  Archive,
  Delete,
  Refresh,
  Warning,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { createWorkspaceApiClient } from "../lib/api";
import type {
  WorkspaceAnalytics,
  WorkspaceStats,
  Workspace,
  WorkspaceStatus,
} from "../types";
import { STATUS_DISPLAY_NAMES } from "../types";

export interface OrgAdminManagementPageProps {
  /** Organization ID to manage */
  orgId: string;
  /** Whether user has org admin permissions */
  isOrgAdmin?: boolean;
  /** Callback when workspaces are updated */
  onWorkspacesUpdated?: () => void;
}

export function OrgAdminManagementPage({
  orgId,
  isOrgAdmin = true,
  onWorkspacesUpdated,
}: OrgAdminManagementPageProps): React.ReactElement {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const data = await client.getAnalytics(orgId);
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
    if (!session?.accessToken) return;

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const result = await client.listWorkspaces({
        org_id: orgId,
        status: undefined, // Get all statuses
        limit: 1000,
      });
      setWorkspaces(result.workspaces);
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchWorkspaces();
  }, [session?.accessToken, orgId]);

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
      await client.updateWorkspace(selectedWorkspace.id, { status: newStatus });
      fetchWorkspaces();
      fetchAnalytics();
      onWorkspacesUpdated?.();
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
      await client.deleteWorkspace(selectedWorkspace.id);
      fetchWorkspaces();
      fetchAnalytics();
      onWorkspacesUpdated?.();
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
          client.updateWorkspace(id, { status: "archived" })
        )
      );
      setSelectedIds([]);
      fetchWorkspaces();
      fetchAnalytics();
      onWorkspacesUpdated?.();
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
      await Promise.all(selectedIds.map((id) => client.deleteWorkspace(id)));
      setSelectedIds([]);
      fetchWorkspaces();
      fetchAnalytics();
      onWorkspacesUpdated?.();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      setError(err instanceof Error ? err.message : "Failed to delete workspaces");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusChipColor = (
    status: WorkspaceStatus
  ): "success" | "default" | "warning" => {
    switch (status) {
      case "active":
        return "success";
      case "archived":
        return "default";
      default:
        return "warning";
    }
  };

  if (!isOrgAdmin) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access this page. Organization admin role
          required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
            Analytics, statistics, and bulk operations
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

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Statistics Cards */}
      {!loading && analytics && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Workspaces
                  </Typography>
                  <Typography variant="h4">{analytics.stats.total}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {analytics.stats.active} active
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
                  <Typography variant="h4">{analytics.stats.active}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <Typography variant="body2" color="success.main">
                      {Math.round(
                        (analytics.stats.active / analytics.stats.total) * 100
                      )}
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
                  <Typography variant="h4">{analytics.stats.archived}</Typography>
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
                    Created This Month
                  </Typography>
                  <Typography variant="h4">
                    {analytics.stats.created_this_month}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}>
                    {analytics.stats.created_this_month > 0 ? (
                      <TrendingUp fontSize="small" color="success" />
                    ) : (
                      <TrendingDown fontSize="small" color="disabled" />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Growth
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Inactive Workspaces Warning */}
          {analytics.inactive_workspaces.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Inactive Workspaces Detected:</strong> {analytics.inactive_workspaces.length} workspace(s) have been inactive for 90+ days
              </Typography>
              <Typography variant="caption" display="block">
                Consider archiving or reviewing these workspaces to free up resources
              </Typography>
            </Alert>
          )}

          {/* Most Active Workspaces */}
          {analytics.most_active.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Most Active Workspaces
              </Typography>
              <Grid container spacing={2}>
                {analytics.most_active.slice(0, 5).map((ws) => (
                  <Grid item xs={12} sm={6} md={4} key={ws.workspace_id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body1" gutterBottom>
                          {ws.workspace_name}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {ws.action_count}
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
      )}

      {/* Workspaces Table */}
      {!loading && workspaces.length > 0 && (
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
                {selectedIds.length} workspace(s) selected
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
                      checked={selectedIds.length === workspaces.length}
                      indeterminate={
                        selectedIds.length > 0 &&
                        selectedIds.length < workspaces.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
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
                {workspaces.map((workspace) => (
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
                    <TableCell>{workspace.member_count || 0}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(workspace.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(workspace.updated_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, workspace)}
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

export default OrgAdminManagementPage;
