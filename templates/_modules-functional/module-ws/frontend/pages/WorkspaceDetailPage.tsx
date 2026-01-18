/**
 * WorkspaceDetailPage Component
 *
 * Detail page for a single workspace showing activities, data, members, and settings.
 * Features tab navigation with mocked CJIS audit data for workflows, chats, and knowledge base.
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
  Card,
  CardContent,
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Edit,
  Archive,
  Delete,
  Star,
  StarBorder,
  ArrowBack,
  Settings as SettingsIcon,
  Add,
  Search,
  Description,
  Chat,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  Group,
  Public,
  Lock,
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
// MOCK DATA - CJIS IT Security Audit Theme
// ============================================================================

interface MockWorkflow {
  id: string;
  name: string;
  type: "IT Policy Review" | "Network Diagram Review" | "Proof Artifact Review";
  status: "draft" | "running" | "complete" | "failed";
  progress: number;
  docsProcessed: number;
  docsTotal: number;
  findings: {
    critical: number;
    nonCompliant: number;
    warning: number;
    compliant: number;
  };
  startedAt?: string;
  completedAt?: string;
  description?: string;
}

interface MockChat {
  id: string;
  name: string;
  visibility: "workspace" | "private";
  lastUser: string;
  lastActivity: string;
  messages: number;
  kbGrounded: boolean;
}

interface MockKBDocument {
  id: string;
  name: string;
  category: string;
  indexed: boolean;
  size: string;
}

const MOCK_WORKFLOWS: MockWorkflow[] = [
  {
    id: "1",
    name: "CJIS Security Policy Area 5: Access Control",
    type: "IT Policy Review",
    status: "running",
    progress: 67,
    docsProcessed: 12,
    docsTotal: 18,
    findings: { critical: 0, nonCompliant: 8, warning: 4, compliant: 15 },
    startedAt: "3 hours ago",
  },
  {
    id: "2",
    name: "Data Center Network Architecture Assessment",
    type: "Network Diagram Review",
    status: "complete",
    progress: 100,
    docsProcessed: 6,
    docsTotal: 6,
    findings: { critical: 2, nonCompliant: 3, warning: 5, compliant: 12 },
    completedAt: "Jan 10, 2026",
  },
  {
    id: "3",
    name: "MFA Implementation Evidence Collection",
    type: "Proof Artifact Review",
    status: "running",
    progress: 45,
    docsProcessed: 9,
    docsTotal: 20,
    findings: { critical: 0, nonCompliant: 2, warning: 3, compliant: 8 },
    startedAt: "1 hour ago",
    description: "AI-evaluated screenshots and config files demonstrating MFA implementation",
  },
  {
    id: "4",
    name: "Encryption Policy Compliance Review",
    type: "IT Policy Review",
    status: "draft",
    progress: 0,
    docsProcessed: 0,
    docsTotal: 0,
    findings: { critical: 0, nonCompliant: 0, warning: 0, compliant: 0 },
  },
];

const MOCK_CHATS: MockChat[] = [
  {
    id: "1",
    name: "Access Control Compliance Questions",
    visibility: "workspace",
    lastUser: "Sarah Chen",
    lastActivity: "15 min ago",
    messages: 18,
    kbGrounded: true,
  },
  {
    id: "2",
    name: "Remediation Planning for Encryption Gaps",
    visibility: "workspace",
    lastUser: "Michael Torres",
    lastActivity: "2 hours ago",
    messages: 12,
    kbGrounded: true,
  },
  {
    id: "3",
    name: "Incident Response Plan Review",
    visibility: "private",
    lastUser: "You",
    lastActivity: "yesterday",
    messages: 6,
    kbGrounded: true,
  },
];

// MOCK_KB_DOCS and MOCK_KB_STATS removed - now using real data from module-kb

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
    ...(kbApiClient ? { apiClient: { kb: kbApiClient } } : {}),
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
    ...(kbApiClient ? { apiClient: { kb: kbApiClient } } : {}),
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

  const getWorkflowStatusColor = (status: MockWorkflow["status"]) => {
    switch (status) {
      case "running":
        return "info";
      case "complete":
        return "success";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const getWorkflowStatusIcon = (status: MockWorkflow["status"]) => {
    switch (status) {
      case "running":
        return <PlayArrow fontSize="small" />;
      case "complete":
        return <CheckCircle fontSize="small" />;
      case "failed":
        return <ErrorIcon fontSize="small" />;
      default:
        return <Description fontSize="small" />;
    }
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
          <Tab label="Activities" {...a11yProps(0)} />
          <Tab label="Data" {...a11yProps(1)} />
          <Tab label="Members" {...a11yProps(2)} />
          <Tab label="Settings" {...a11yProps(3)} />
        </Tabs>

        {/* Tab 0: Activities */}
        <TabPanel value={activeTab} index={0}>
          {/* Workflows Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h5">📋 Workflows</Typography>
              {canEdit && (
                <Button variant="contained" startIcon={<Add />} size="small">
                  New Workflow
                </Button>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select label="Type" defaultValue="all">
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="it-policy">IT Policy Review</MenuItem>
                  <MenuItem value="network">Network Diagram Review</MenuItem>
                  <MenuItem value="proof">Proof Artifact Review</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" defaultValue="all">
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="running">Running</MenuItem>
                  <MenuItem value="complete">Complete</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Search workflows..."
                aria-label="Search workflows"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
            </Box>

            {MOCK_WORKFLOWS.map((workflow) => (
              <Card key={workflow.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Typography variant="h6">{workflow.name}</Typography>
                        <Chip
                          icon={getWorkflowStatusIcon(workflow.status)}
                          label={workflow.status}
                          size="small"
                          color={getWorkflowStatusColor(workflow.status)}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Type: {workflow.type}
                      </Typography>
                      {workflow.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {workflow.description}
                        </Typography>
                      )}
                      {workflow.status === "running" && (
                        <>
                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="caption">
                                {workflow.docsProcessed}/{workflow.docsTotal} documents processed
                              </Typography>
                              <Typography variant="caption">{workflow.progress}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={workflow.progress} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Started: {workflow.startedAt}
                          </Typography>
                        </>
                      )}
                      {workflow.status === "complete" && (
                        <Typography variant="caption" color="text.secondary">
                          Completed: {workflow.completedAt}
                        </Typography>
                      )}
                      {(workflow.status === "running" || workflow.status === "complete") && (
                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                          <Chip
                            label={`${workflow.findings.critical} Critical`}
                            size="small"
                            color="error"
                            variant={workflow.findings.critical > 0 ? "filled" : "outlined"}
                          />
                          <Chip
                            label={`${workflow.findings.nonCompliant} Non-Compliant`}
                            size="small"
                            color="warning"
                            variant={workflow.findings.nonCompliant > 0 ? "filled" : "outlined"}
                          />
                          <Chip
                            label={`${workflow.findings.warning} Warning`}
                            size="small"
                            color="info"
                            variant={workflow.findings.warning > 0 ? "filled" : "outlined"}
                          />
                          <Chip
                            label={`${workflow.findings.compliant} Compliant`}
                            size="small"
                            color="success"
                            variant={workflow.findings.compliant > 0 ? "filled" : "outlined"}
                          />
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {workflow.status === "running" && (
                        <Button variant="outlined" size="small">
                          View Progress
                        </Button>
                      )}
                      {workflow.status === "complete" && (
                        <>
                          <Button variant="outlined" size="small">
                            View Report
                          </Button>
                          <Button variant="outlined" size="small">
                            Export PDF
                          </Button>
                        </>
                      )}
                      {workflow.status === "draft" && (
                        <>
                          <Button variant="outlined" size="small">
                            Configure
                          </Button>
                          <Button variant="contained" size="small">
                            Start Analysis
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Chats Section */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">💬 Chats</Typography>
              <Button variant="contained" startIcon={<Add />} size="small">
                New Chat
              </Button>
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search chats..."
                aria-label="Search chats"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {MOCK_CHATS.map((chat) => (
              <Card key={chat.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Typography variant="h6">{chat.name}</Typography>
                        <Chip
                          icon={chat.visibility === "workspace" ? <Group /> : <Lock />}
                          label={chat.visibility === "workspace" ? "Shared" : "Private"}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      {chat.kbGrounded && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                          📚 Grounded with: CJIS Audit 2026 KB (37 documents)
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Last: {chat.lastUser} ({chat.lastActivity}) • {chat.messages} messages
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small">
                      Continue Chat
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
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
