"use client";

/**
 * Eval Optimizer - Workspace Detail Page
 *
 * Route: /ws/[id]
 * Custom workspace detail page with optimization-specific tabs:
 * - Overview: Workspace info and getting started guide
 * - Context: Domain context documents for RAG (uses module-kb)
 * - Optimization: List optimization runs + create new
 * - Settings: Workspace settings
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext, useUser } from "@{{PROJECT_NAME}}/module-access";
import { useWorkspace, useWorkspaceConfig } from "@{{PROJECT_NAME}}/module-ws";
import {
  WorkspaceDataKBTab,
  useKnowledgeBase,
  useKbDocuments,
  createKbModuleClient,
} from "@{{PROJECT_NAME}}/module-kb";
import { createAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ArrowBack,
  Star,
  StarBorder,
  Description,
  Science,
  PlayArrow,
  Settings,
  Add,
} from "@mui/icons-material";

// ============================================================================
// TYPES
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface OptimizationRun {
  id: string;
  name: string;
  doc_type_id: string;
  doc_type_name?: string;
  criteria_set_id: string;
  criteria_set_name?: string;
  truth_set_count: number;
  status: "draft" | "in_progress" | "optimized" | "failed";
  created_at: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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

export default function EvalOptWorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();
  const { profile, isAuthenticated, loading: authLoading, authAdapter } = useUser();

  const workspaceId = params.id as string;
  const orgId = currentOrganization?.orgId || "";
  const userId = profile?.id || "";

  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [kbApiClient, setKbApiClient] = useState<{ kb: ReturnType<typeof createKbModuleClient> } | null>(null);

  // Get workspace config for navigation labels
  const { navLabelPlural } = useWorkspaceConfig({ orgId });

  // Initialize KB API client when authenticated
  useEffect(() => {
    const initKbClient = async () => {
      if (!isAuthenticated || !authAdapter) {
        setKbApiClient(null);
        return;
      }
      try {
        const token = await authAdapter.getToken();
        if (token) {
          const authClient = createAuthenticatedClient(token);
          const kbClient = createKbModuleClient(authClient);
          setKbApiClient({ kb: kbClient });
        }
      } catch (err) {
        console.error('Failed to initialize KB client:', err);
      }
    };
    initKbClient();
  }, [isAuthenticated, authAdapter]);

  // Get workspace data from module-ws
  const {
    workspace,
    loading: wsLoading,
    error: wsError,
    toggleFavorite,
  } = useWorkspace(workspaceId, { autoFetch: true, orgId });

  // KB hooks for workspace (Context tab)
  const {
    kb,
    availableKbs,
    loading: kbLoading,
    error: kbError,
    toggleKb,
  } = useKnowledgeBase({
    scope: "workspace",
    scopeId: workspaceId,
    apiClient: kbApiClient || undefined,
    autoFetch: isAuthenticated && !!kbApiClient,
  });

  const {
    documents,
    loading: docsLoading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  } = useKbDocuments({
    scope: "workspace",
    scopeId: workspaceId,
    apiClient: kbApiClient || undefined,
    autoFetch: isAuthenticated && !!kbApiClient,
  });

  // Group available KBs for WorkspaceDataKBTab
  const groupedAvailableKbs = useMemo(() => {
    const workspaceKb = availableKbs.find((kb: any) => kb.kb.scope === "workspace");
    const orgKbs = availableKbs.filter((kb: any) => kb.kb.scope === "org");
    const globalKbs = availableKbs.filter((kb: any) => kb.kb.scope === "sys");

    return {
      workspaceKb,
      chatKb: undefined,
      orgKbs,
      globalKbs,
    };
  }, [availableKbs]);

  // Load optimization runs
  const loadRuns = useCallback(async () => {
    if (!isAuthenticated || !workspaceId) return;

    setRunsLoading(true);
    try {
      const token = await authAdapter.getToken();
      if (!token) return;
      const client = createAuthenticatedClient(token);
      const response = await client.get(`/eval-opt/workspaces/${workspaceId}/runs`);
      setRuns(response.data || []);
    } catch (err: any) {
      console.error("Error loading optimization runs:", err);
    } finally {
      setRunsLoading(false);
    }
  }, [isAuthenticated, workspaceId, authAdapter]);

  useEffect(() => {
    if (isAuthenticated && workspaceId) {
      loadRuns();
    }
  }, [isAuthenticated, workspaceId, loadRuns]);

  const handleBack = () => {
    router.push("/ws");
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite();
  };

  const handleRunClick = (runId: string) => {
    router.push(`/ws/${workspaceId}/runs/${runId}`);
  };

  // Loading state
  if (authLoading || wsLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Auth check
  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Please sign in to view workspace details.</Alert>
      </Container>
    );
  }

  // Error state
  if (wsError || !workspace) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{wsError || "Workspace not found"}</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Workspaces
        </Button>
      </Container>
    );
  }

  const canEdit = workspace.userRole === "ws_owner" || workspace.userRole === "ws_admin";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleBack}
          aria-label={`Back to ${navLabelPlural.toLowerCase()} list`}
          sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <ArrowBack fontSize="small" sx={{ mr: 0.5 }} />
          {navLabelPlural}
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
              backgroundColor: workspace?.color || "#6366f1",
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
              <Chip label="Eval Optimizer" size="small" color="secondary" />
            </Box>
            {workspace?.description && (
              <Typography variant="body2" color="text.secondary">
                {workspace.description}
              </Typography>
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
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="eval optimizer workspace tabs">
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Context" {...a11yProps(1)} />
          <Tab label="Optimization" {...a11yProps(2)} />
          <Tab label="Settings" {...a11yProps(3)} />
        </Tabs>
        <Divider />

        {/* Tab: Overview */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Optimization Overview
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Description color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Context Documents
                    </Typography>
                  </Box>
                  <Typography variant="h4">{documents?.length || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Domain standards for RAG
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Science color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Optimization Runs
                    </Typography>
                  </Box>
                  <Typography variant="h4">{runs.length}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total runs created
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PlayArrow color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Optimized Configs
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {runs.filter((r) => r.status === "optimized").length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Successfully optimized
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Getting Started with Prompt Optimization
              </Typography>
              <ol style={{ margin: 0, paddingLeft: "1.5rem" }}>
                <li>
                  <strong>Upload Context Documents</strong> (Context tab) - Domain standards, guides,
                  requirements for RAG
                </li>
                <li>
                  <strong>Create Optimization Run</strong> (Optimization tab) - Select doc type +
                  criteria set
                </li>
                <li>
                  <strong>Define Response Sections</strong> - Structure the AI response format
                </li>
                <li>
                  <strong>Create Truth Sets</strong> - Upload documents and manually evaluate criteria
                </li>
                <li>
                  <strong>Run Optimization</strong> - System generates and tests prompts automatically
                </li>
              </ol>
            </Alert>
          </Box>
        </TabPanel>

        {/* Tab: Context */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                What are Context Documents?
              </Typography>
              <Typography variant="body2">
                Context documents provide domain knowledge that helps the AI understand what it&apos;s
                evaluating. For example:
              </Typography>
              <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                <li>
                  <strong>CJIS IT Security Audits:</strong> Upload CJIS requirements, security control
                  standards
                </li>
                <li>
                  <strong>Federal Appraisals:</strong> Upload USPAP guidelines, valuation standards
                </li>
                <li>
                  <strong>FOIA Requests:</strong> Upload exemption guidelines, redaction rules
                </li>
              </ul>
            </Alert>

            {/* Use module-kb WorkspaceDataKBTab */}
            <WorkspaceDataKBTab
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
          </Box>
        </TabPanel>

        {/* Tab: Optimization */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}
            >
              <div>
                <Typography variant="h6" gutterBottom>
                  Optimization Runs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create optimization runs to train and test prompts against truth sets.
                </Typography>
              </div>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                New Optimization Run
              </Button>
            </Box>

            {runsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : runs.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <Science sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No optimization runs yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first optimization run to start training prompts.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Optimization Run
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {runs.map((run) => (
                  <Grid item xs={12} key={run.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        "&:hover": { boxShadow: 2 },
                      }}
                      onClick={() => handleRunClick(run.id)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {run.name || "Untitled Run"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {run.doc_type_name || "Unknown Doc Type"} •{" "}
                            {run.criteria_set_name || "Unknown Criteria Set"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {run.truth_set_count} Truth Sets • Created{" "}
                            {new Date(run.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Chip
                          label={
                            run.status === "optimized"
                              ? "Optimized"
                              : run.status === "in_progress"
                              ? "In Progress"
                              : run.status === "failed"
                              ? "Failed"
                              : "Draft"
                          }
                          size="small"
                          color={
                            run.status === "optimized"
                              ? "success"
                              : run.status === "in_progress"
                              ? "info"
                              : run.status === "failed"
                              ? "error"
                              : "default"
                          }
                        />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Settings */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workspace Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure optimization settings for this workspace.
            </Typography>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Workspace Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">{workspace?.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                    {workspaceId}
                  </Typography>
                </Grid>
                {workspace?.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">{workspace.description}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>

      {/* Create Optimization Run Dialog */}
      <CreateOptimizationRunDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        workspaceId={workspaceId}
        authAdapter={authAdapter}
        onCreated={(runId) => {
          setCreateDialogOpen(false);
          router.push(`/ws/${workspaceId}/runs/${runId}`);
        }}
      />
    </Container>
  );
}

// ============================================================================
// CREATE OPTIMIZATION RUN DIALOG
// ============================================================================

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  authAdapter: any;
  onCreated: (runId: string) => void;
}

function CreateOptimizationRunDialog({
  open,
  onClose,
  workspaceId,
  authAdapter,
  onCreated,
}: CreateDialogProps) {
  const [name, setName] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [criteriaSetId, setCriteriaSetId] = useState("");
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load doc types and criteria sets when dialog opens
  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    try {
      const token = await authAdapter.getToken();
      if (!token) return;
      const client = createAuthenticatedClient(token);

      // Load doc types from module-eval
      const docTypesRes = await client.get("/eval/doc-types");
      setDocTypes(docTypesRes.data || []);

      // Load criteria sets from module-eval
      const criteriaSetsRes = await client.get("/eval/criteria-sets");
      setCriteriaSets(criteriaSetsRes.data || []);
    } catch (err: any) {
      console.error("Error loading options:", err);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !docTypeId || !criteriaSetId) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication error");
        return;
      }
      const client = createAuthenticatedClient(token);

      const response = await client.post(`/eval-opt/workspaces/${workspaceId}/runs`, {
        name: name.trim(),
        doc_type_id: docTypeId,
        criteria_set_id: criteriaSetId,
      });

      onCreated(response.data.id);
    } catch (err: any) {
      setError(err.message || "Failed to create optimization run");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDocTypeId("");
    setCriteriaSetId("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Optimization Run</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Run Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="e.g., CJIS Compliance v1"
          />

          <FormControl fullWidth>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={docTypeId}
              onChange={(e) => setDocTypeId(e.target.value)}
              label="Document Type"
            >
              {docTypes.map((dt) => (
                <MenuItem key={dt.id} value={dt.id}>
                  {dt.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Criteria Set</InputLabel>
            <Select
              value={criteriaSetId}
              onChange={(e) => setCriteriaSetId(e.target.value)}
              label="Criteria Set"
            >
              {criteriaSets.map((cs) => (
                <MenuItem key={cs.id} value={cs.id}>
                  {cs.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleCreate} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}