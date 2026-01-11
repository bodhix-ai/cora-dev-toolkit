/**
 * WorkspaceDetailAdminPage Component
 *
 * Detailed admin view for a single workspace.
 * Provides comprehensive workspace management capabilities.
 * 
 * Features:
 * - Overview Tab: Workspace details and statistics
 * - Members Tab: Member management and role assignment
 * - Activity Tab: Audit trail and recent activity
 * - Danger Zone Tab: Archive, delete, transfer ownership
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
  Tabs,
  Tab,
  Chip,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  Archive,
  Delete,
  SwapHoriz,
  MoreVert,
  PersonAdd,
  Refresh,
  Warning,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { createWorkspaceApiClient } from "../lib/api";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceStatus,
} from "../types";
import { STATUS_DISPLAY_NAMES, WORKSPACE_ROLE_DISPLAY_NAMES } from "../types";

export interface WorkspaceDetailAdminPageProps {
  /** Workspace ID to display */
  workspaceId: string;
  /** Organization ID */
  orgId: string;
  /** Whether user has org admin permissions */
  isOrgAdmin?: boolean;
  /** Callback when workspace is updated */
  onWorkspaceUpdated?: (workspace: Workspace) => void;
  /** Callback to navigate back */
  onBack?: () => void;
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
      id={`workspace-detail-tabpanel-${index}`}
      aria-labelledby={`workspace-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function WorkspaceDetailAdminPage({
  workspaceId,
  orgId,
  isOrgAdmin = true,
  onWorkspaceUpdated,
  onBack,
}: WorkspaceDetailAdminPageProps): React.ReactElement {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Mock activity data (TODO: Implement activity API)
  const activityLog = [
    { id: 1, action: "Workspace created", user: "John Doe", timestamp: new Date("2025-12-01T10:00:00Z") },
    { id: 2, action: "Member added: Sarah Smith", user: "John Doe", timestamp: new Date("2025-12-05T14:30:00Z") },
    { id: 3, action: "Workspace name changed", user: "Sarah Smith", timestamp: new Date("2025-12-15T09:15:00Z") },
    { id: 4, action: "Tag added: engineering", user: "John Doe", timestamp: new Date("2025-12-20T16:45:00Z") },
  ];

  // Fetch workspace details
  const fetchWorkspace = async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const data = await client.getWorkspace(workspaceId, orgId);
      
      if (data) {
        setWorkspace(data);
        onWorkspaceUpdated?.(data);
      } else {
        setError("Workspace not found");
      }
    } catch (err) {
      console.error("Failed to fetch workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  // Fetch members
  const fetchMembers = async () => {
    if (!session?.accessToken) return;

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const data = await client.listMembers(workspaceId, orgId);
      setMembers(data);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  };

  useEffect(() => {
    fetchWorkspace();
    fetchMembers();
  }, [session?.accessToken, workspaceId, orgId]);

  const handleArchive = async () => {
    if (!workspace || !session?.accessToken) return;

    setActionLoading(true);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const newStatus: WorkspaceStatus = workspace.status === "active" ? "archived" : "active";
      const updated = await client.updateWorkspace(workspaceId, { status: newStatus }, orgId);
      setWorkspace(updated);
      onWorkspaceUpdated?.(updated);
      setArchiveDialogOpen(false);
    } catch (err) {
      console.error("Failed to update workspace status:", err);
      setError(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.accessToken) return;

    setActionLoading(true);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      await client.deleteWorkspace(workspaceId, orgId, true);
      setDeleteDialogOpen(false);
      
      // Navigate back after deletion
      onBack?.();
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!newOwnerId || !session?.accessToken) return;

    setActionLoading(true);

    try {
      // TODO: Implement transfer ownership API endpoint
      console.log("Transfer ownership to:", newOwnerId);
      setTransferDialogOpen(false);
      setNewOwnerId("");
      
      // Refresh data
      await fetchWorkspace();
      await fetchMembers();
    } catch (err) {
      console.error("Failed to transfer ownership:", err);
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusChipColor = (status: WorkspaceStatus): "success" | "default" | "warning" => {
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access this page. Organization admin role required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{ mb: 2 }}
        >
          Back to Workspaces
        </Button>

        {workspace && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  bgcolor: workspace.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" gutterBottom>
                  {workspace.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={STATUS_DISPLAY_NAMES[workspace.status]}
                    color={getStatusChipColor(workspace.status)}
                    size="small"
                  />
                  {workspace.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  fetchWorkspace();
                  fetchMembers();
                }}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
            {workspace.description && (
              <Typography variant="body2" color="text.secondary">
                {workspace.description}
              </Typography>
            )}
          </>
        )}
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
          aria-label="Workspace detail tabs"
        >
          <Tab label="Overview" id="workspace-detail-tab-0" />
          <Tab label="Members" id="workspace-detail-tab-1" />
          <Tab label="Activity" id="workspace-detail-tab-2" />
          <Tab label="Danger Zone" id="workspace-detail-tab-3" />
        </Tabs>
      </Paper>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Panels */}
      {!loading && workspace && (
        <>
          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              {/* Workspace Details */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    Workspace Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">{workspace.name}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Typography variant="body1">
                        {STATUS_DISPLAY_NAMES[workspace.status]}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Color
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: workspace.color,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        />
                        <Typography variant="body1">{workspace.color}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Members
                      </Typography>
                      <Typography variant="body1">{workspace.member_count || 0}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body1">
                        {new Date(workspace.created_at).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body1">
                        {new Date(workspace.updated_at).toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Statistics */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4">{workspace.member_count || 0}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Members
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4">0</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Chats
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4">0</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Knowledge Bases
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h4">0</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Workflows
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      Resource counts (Chats, KBs, Workflows) will be populated when those modules are integrated.
                    </Typography>
                  </Alert>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Members Tab */}
          <TabPanel value={activeTab} index={1}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">
                  Members ({members.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  size="small"
                >
                  Add Member
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {members.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.user_id}>
                          <TableCell>
                            <Typography variant="body2">{member.user_id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={WORKSPACE_ROLE_DISPLAY_NAMES[member.ws_role]}
                              size="small"
                              color={member.ws_role === "ws_owner" ? "primary" : "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(member.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" aria-label="Member actions">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  No members found
                </Typography>
              )}
            </Paper>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={activeTab} index={2}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Log
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityLog.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell>{activity.user}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {activity.timestamp.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Activity log is currently displaying mock data. Implement audit trail API to show real workspace activity.
                </Typography>
              </Alert>
            </Paper>
          </TabPanel>

          {/* Danger Zone Tab */}
          <TabPanel value={activeTab} index={3}>
            <Paper sx={{ p: 3, border: "1px solid", borderColor: "error.main" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Warning color="error" />
                <Typography variant="h6" color="error">
                  Danger Zone
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                These actions are permanent and cannot be undone. Use with caution.
              </Typography>
              <Divider sx={{ my: 3 }} />

              <Grid container spacing={3}>
                {/* Archive/Unarchive */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        {workspace.status === "active" ? "Archive Workspace" : "Restore Workspace"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workspace.status === "active"
                          ? "Archive this workspace to prevent access while preserving data"
                          : "Restore this workspace to make it accessible again"}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<Archive />}
                      onClick={() => setArchiveDialogOpen(true)}
                    >
                      {workspace.status === "active" ? "Archive" : "Restore"}
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                {/* Transfer Ownership */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Transfer Ownership
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Transfer primary ownership to another organization member
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<SwapHoriz />}
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      Transfer
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                {/* Permanent Delete */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="subtitle1" gutterBottom color="error">
                        Delete Workspace Permanently
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Permanently delete this workspace and all associated data. This action cannot be undone.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        </>
      )}

      {/* Archive Dialog */}
      <Dialog open={archiveDialogOpen} onClose={() => setArchiveDialogOpen(false)}>
        <DialogTitle>
          {workspace?.status === "active" ? "Archive Workspace?" : "Restore Workspace?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {workspace?.status === "active"
              ? `Are you sure you want to archive "${workspace?.name}"? Users will no longer be able to access it.`
              : `Are you sure you want to restore "${workspace?.name}"? It will become accessible again.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleArchive}
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? "Processing..." : workspace?.status === "active" ? "Archive" : "Restore"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Workspace Permanently?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to permanently delete "{workspace?.name}"? All data will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={actionLoading}
          >
            {actionLoading ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)}>
        <DialogTitle>Transfer Ownership</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Select a new owner for this workspace:
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>New Owner</InputLabel>
            <Select
              value={newOwnerId}
              label="New Owner"
              onChange={(e) => setNewOwnerId(e.target.value)}
            >
              {members
                .filter((m) => m.ws_role !== "ws_owner")
                .map((member) => (
                  <MenuItem key={member.user_id} value={member.user_id}>
                    {member.user_id}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            Transfer ownership API endpoint needs to be implemented on the backend.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleTransfer}
            variant="contained"
            disabled={!newOwnerId || actionLoading}
          >
            {actionLoading ? "Transferring..." : "Transfer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default WorkspaceDetailAdminPage;
