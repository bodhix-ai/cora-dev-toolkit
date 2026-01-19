/**
 * WorkspaceDetailPage Component
 *
 * Detail page for a single workspace showing overview, data, members, and settings.
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Edit,
  Archive,
  Delete,
  Star,
  StarBorder,
  ArrowBack,
  Group,
  Folder,
  Storage,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import type { Workspace, WorkspaceRole } from "../types";
import { WORKSPACE_ROLE_DISPLAY_NAMES, STATUS_DISPLAY_NAMES } from "../types";
import { useWorkspace } from "../hooks/useWorkspace";
import { MemberList } from "../components/MemberList";
import { WorkspaceForm } from "../components/WorkspaceForm";
import { createWorkspaceApiClient } from "../lib/api";
import type { WorkspaceApiClient } from "../lib/api";
import { 
  WorkspaceDataKBTab,
  useKnowledgeBase,
  useKbDocuments,
  createKbModuleClient,
  type AvailableKb,
} from "@{{PROJECT_NAME}}/module-kb";
import { createAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";


// ============================================================================
// COMPONENT INTERFACES & HELPERS
// ============================================================================

export interface WorkspaceDetailPageProps {
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID */
  orgId: string;
  /** Current user ID */
  userId?: string;
  /** API client for workspace operations */
  apiClient?: WorkspaceApiClient;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Callback when workspace is deleted */
  onDeleted?: () => void;
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
      id={`workspace-tabpanel-${index}`}
      aria-labelledby={`workspace-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `workspace-tab-${index}`,
    "aria-controls": `workspace-tabpanel-${index}`,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkspaceDetailPage({
  workspaceId,
  orgId,
  userId,
  apiClient: providedApiClient,
  onBack,
  onDeleted,
}: WorkspaceDetailPageProps): React.ReactElement {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Get session for API client creation
  const { data: session } = useSession();

  // Create API client if not provided
  const apiClient = useMemo(() => {
    if (providedApiClient) return providedApiClient;
    if (session?.accessToken) {
      return createWorkspaceApiClient(session.accessToken as string);
    }
    return null;
  }, [providedApiClient, session?.accessToken]);

  const {
    workspace,
    members,
    loading,
    error,
    updateWorkspace,
    deleteWorkspace,
    toggleFavorite,
    addMember,
    updateMember,
    removeMember,
    refetch,
  } = useWorkspace(workspaceId, { autoFetch: true, orgId });

  // Create KB API client
  const kbApiClient = useMemo(() => {
    if (session?.accessToken) {
      const authClient = createAuthenticatedClient(session.accessToken as string);
      return createKbModuleClient(authClient);
    }
    return null;
  }, [session?.accessToken]);

  // KB hooks for workspace
  const { 
    kb, 
    availableKbs, 
    loading: kbLoading, 
    error: kbError, 
    toggleKb 
  } = useKnowledgeBase({
    scope: 'workspace',
    scopeId: workspaceId,
    apiClient: kbApiClient ? { kb: kbApiClient } : undefined,
    autoFetch: !!kbApiClient,
  });

  const { 
    documents, 
    loading: docsLoading, 
    uploadDocument, 
    deleteDocument, 
    downloadDocument 
  } = useKbDocuments({
    scope: 'workspace',
    scopeId: workspaceId,
    apiClient: kbApiClient ? { kb: kbApiClient } : undefined,
    autoFetch: !!kbApiClient,
  });

  // Group available KBs for WorkspaceDataKBTab
  const groupedAvailableKbs = useMemo(() => {
    // Find workspace KB from available KBs
    const workspaceKb = availableKbs.find((kb: AvailableKb) => kb.kb.scope === 'workspace');
    const orgKbs = availableKbs.filter((kb: AvailableKb) => kb.kb.scope === 'org');
    const globalKbs = availableKbs.filter((kb: AvailableKb) => kb.kb.scope === 'sys');

    return {
      workspaceKb,
      chatKb: undefined, // Not used in workspace context
      orgKbs,
      globalKbs,
    };
  }, [availableKbs]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !workspace) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || "Workspace not found"}</Alert>
      </Container>
    );
  }

  const userRole = workspace.userRole;
  const canEdit = userRole === "ws_owner" || userRole === "ws_admin";
  const canDelete = userRole === "ws_owner";

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleArchiveClick = async () => {
    const newStatus = workspace.status === "active" ? "archived" : "active";
    await updateWorkspace({ status: newStatus });
  };

  const handleDeleteClick = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`
    );
    if (confirmed) {
      await deleteWorkspace();
      onDeleted?.();
    }
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite();
  };

  const handleUpdateSuccess = () => {
    setEditDialogOpen(false);
    refetch();
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      await updateMember(memberId, { wsRole: newRole });
    } catch (error) {
      console.error("Failed to update member role:", error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={onBack}
          aria-label="Back to workspaces list"
          sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <ArrowBack fontSize="small" sx={{ mr: 0.5 }} />
          Workspaces
        </Link>
        <Typography variant="body2" color="text.primary">
          {workspace?.name || "Workspace"}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          {/* Color indicator */}
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              backgroundColor: workspace?.color || "#666",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "1.5rem",
              fontWeight: 600,
            }}
          >
            {workspace?.name?.charAt(0).toUpperCase() || "W"}
          </Box>

          {/* Title and meta */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h4">{workspace?.name || "Workspace"}</Typography>
              <Chip
                label={STATUS_DISPLAY_NAMES[workspace?.status || "active"]}
                size="small"
                color={workspace?.status === "active" ? "success" : "warning"}
              />
              {userRole && (
                <Chip
                  label={WORKSPACE_ROLE_DISPLAY_NAMES[userRole]}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            {workspace?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {workspace.description}
              </Typography>
            )}
            {workspace?.tags && workspace.tags.length > 0 && (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {workspace.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={handleToggleFavorite}
              color={workspace?.isFavorited ? "warning" : "default"}
              aria-label={workspace?.isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {workspace?.isFavorited ? <Star /> : <StarBorder />}
            </IconButton>
            {canEdit && (
              <>
                <Button variant="outlined" startIcon={<Edit />} onClick={handleEditClick}>
                  Edit
                </Button>
                <Button variant="outlined" startIcon={<Archive />} onClick={handleArchiveClick}>
                  {workspace?.status === "active" ? "Archive" : "Unarchive"}
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeleteClick}
              >
                Delete
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="workspace tabs">
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Data" {...a11yProps(1)} />
          <Tab label="Members" {...a11yProps(2)} />
          <Tab label="Settings" {...a11yProps(3)} />
        </Tabs>

        {/* Tab 0: Overview */}
        <TabPanel value={activeTab} index={0}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Workspace Overview
            </Typography>
            
            {/* Workspace Info Grid */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Creation Date */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Folder color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Created
                    </Typography>
                  </Box>
                  <Typography variant="h6">
                    {workspace?.createdAt 
                      ? new Date(workspace.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              {/* Members Count */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Group color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Members
                    </Typography>
                  </Box>
                  <Typography variant="h6">
                    {members?.length || 0}
                  </Typography>
                </Paper>
              </Grid>

              {/* Description */}
              {workspace?.description && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Storage color="primary" />
                      <Typography variant="subtitle2" color="text.secondary">
                        Description
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {workspace.description}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab 1: Data */}
        <TabPanel value={activeTab} index={1}>
          {/* Knowledge Base Section - Integrated with module-kb */}
          <WorkspaceDataKBTab
            workspaceId={workspaceId}
            kb={kb}
            availableKbs={groupedAvailableKbs}
            documents={documents}
            kbLoading={kbLoading}
            documentsLoading={docsLoading}
            error={kbError}
            canUpload={canEdit}
            onToggleKb={toggleKb}
            onUploadDocument={async (files: File[]) => {
              for (const file of files) {
                await uploadDocument(file);
              }
            }}
            onDeleteDocument={deleteDocument}
            onDownloadDocument={downloadDocument}
            currentUserId={userId}
          />
        </TabPanel>

        {/* Tab 2: Members */}
        <TabPanel value={activeTab} index={2}>
          <MemberList
            members={members || []}
            currentUserRole={userRole}
            currentUserId={userId}
            onUpdateRole={handleUpdateMemberRole}
            onRemoveMember={removeMember}
            onAddMember={() => {
              // TODO: Implement add member dialog
              console.log("Add member clicked");
            }}
          />
        </TabPanel>

        {/* Tab 3: Settings */}
        <TabPanel value={activeTab} index={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Workspace Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Additional settings and danger zone actions.
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Danger Zone */}
            <Box>
              <Typography variant="h6" color="error" gutterBottom>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These actions are irreversible. Please be certain.
              </Typography>
              {canDelete && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleDeleteClick}
                >
                  Delete Workspace
                </Button>
              )}
            </Box>
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit dialog */}
      <WorkspaceForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        workspace={workspace}
        onUpdate={
          apiClient ? async (wsId, values) => apiClient.updateWorkspace(wsId, values, orgId) : undefined
        }
        onUpdateSuccess={handleUpdateSuccess}
      />
    </Container>
  );
}

export default WorkspaceDetailPage;
