"use client";

/**
 * Eval Optimizer - Optimization Run Details Page
 *
 * Route: /ws/[id]/runs/[runId]
 * Displays run details with collapsible sections:
 * - Response Sections: Define/edit AI response structure (collapse when complete)
 * - Truth Sets: List and create truth sets (collapse when complete)
 * - Optimization Executions: Multiple optimization runs with parameter configuration
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext, useUser } from "@{{PROJECT_NAME}}/module-access";
import { useWorkspace, useWorkspaceConfig } from "@{{PROJECT_NAME}}/module-ws";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Snackbar,
} from "@mui/material";
import {
  Add,
  Edit,
  Description,
  CheckCircle,
  Schedule,
} from "@mui/icons-material";
import CollapsibleSection from "@/components/CollapsibleSection";
import ExecutionCard from "@/components/ExecutionCard";
import ExecutionParameterDialog, { ExecutionParameters } from "@/components/ExecutionParameterDialog";
import TruthSetUploadDialog from "@/components/TruthSetUploadDialog";

// ============================================================================
// TYPES
// ============================================================================

interface ResponseSection {
  id: string;
  name: string;
  type: "text" | "list" | "number" | "boolean";
  description?: string;
  required: boolean;
  order_index: number;
}

interface TruthSet {
  id: string;
  document_name: string;
  document_id: string;
  progress_pct: number;
  completed_criteria: number;
  total_criteria: number;
  status: "incomplete" | "complete";
  created_at: string;
}

interface OptimizationRun {
  id: string;
  name: string;
  doc_type_id: string;
  doc_type_name?: string;
  criteria_set_id: string;
  criteria_set_name?: string;
  status: "draft" | "pending" | "processing" | "completed" | "failed" | "cancelled";
  response_structure_id?: string;
  truth_set_count: number;
  accuracy?: number;
  created_at: string;
  updated_at: string;
}

interface Execution {
  id: string;
  executionNumber: number;
  status: "pending" | "running" | "completed" | "failed";
  maxTrials: number;
  overallAccuracy?: number;
  bestVariation?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  currentPhase?: number;
  currentPhaseName?: string;
  progress?: number;
  progressMessage?: string;
}

interface PhaseData {
  phaseNumber: number;
  phaseName: string;
  status: "pending" | "in_progress" | "complete" | "failed";
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface VariationProgress {
  variationName: string;
  status: "pending" | "running" | "complete" | "error";
  criteriaTotal: number;
  criteriaCompleted: number;
  accuracy?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: OptimizationRun["status"]) {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
    case "processing":
      return "info";
    case "failed":
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

function getStatusLabel(status: OptimizationRun["status"]) {
  switch (status) {
    case "completed":
      return "Optimized";
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Draft";
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OptimizationRunDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();
  const { profile, isAuthenticated, loading: authLoading, authAdapter } = useUser();

  const workspaceId = params.id as string;
  const runId = params.runId as string;
  const orgId = currentOrganization?.orgId || "";

  // Refs for stability
  const authAdapterRef = useRef(authAdapter);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    authAdapterRef.current = authAdapter;
    isAuthenticatedRef.current = isAuthenticated;
  }, [authAdapter, isAuthenticated]);

  // State
  const [run, setRun] = useState<OptimizationRun | null>(null);
  const [sections, setSections] = useState<ResponseSection[]>([]);
  const [truthSets, setTruthSets] = useState<TruthSet[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [phases, setPhases] = useState<Record<string, PhaseData[]>>({});
  const [variations, setVariations] = useState<Record<string, VariationProgress[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [executionLoading, setExecutionLoading] = useState(false);

  // Section collapse states
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [truthSetsExpanded, setTruthSetsExpanded] = useState(true);

  // Get workspace config for navigation labels
  const { navLabelPlural } = useWorkspaceConfig({ orgId });

  // Get workspace data
  const { workspace, loading: wsLoading } = useWorkspace(workspaceId, {
    autoFetch: true,
    orgId,
  });

  // Load run details - STABILIZED to prevent infinite loops
  const loadRunDetails = useCallback(async () => {
    if (!isAuthenticatedRef.current || !workspaceId || !runId) return;

    try {
      const token = await authAdapterRef.current.getToken();
      if (!token) return;
      const client = createCoraAuthenticatedClient(token);

      // Load run details
      const runRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}`)) as any;
      setRun(runRes.data);

      // Load response sections
      const sectionsRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/sections`)) as any;
      setSections(sectionsRes.data || []);

      // Load truth sets
      const truthSetsRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/truth-sets`)) as any;
      setTruthSets(truthSetsRes.data || []);

      // Load executions
      try {
        const executionsRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/executions`)) as any;
        setExecutions(executionsRes.data || []);

        // Load phases and variations for each running execution
        const runningExecutions = (executionsRes.data || []).filter((e: Execution) => e.status === "running");
        for (const exec of runningExecutions) {
          try {
            const phasesRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/executions/${exec.id}/phases`)) as any;
            setPhases(prev => ({ ...prev, [exec.id]: phasesRes.data || [] }));
          } catch (phaseErr) {
            console.warn(`Phase data not available for execution ${exec.id}:`, phaseErr);
          }

          if (exec.currentPhase === 4) {
            try {
              const variationsRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/executions/${exec.id}/variations`)) as any;
              setVariations(prev => ({ ...prev, [exec.id]: variationsRes.data || [] }));
            } catch (varErr) {
              console.warn(`Variation data not available for execution ${exec.id}:`, varErr);
            }
          }
        }
      } catch (execErr) {
        console.warn("Executions endpoint not available:", execErr);
      }
    } catch (err: any) {
      console.error("Error loading run details:", err);
    }
  }, [workspaceId, runId]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && workspaceId && runId && !run) {
      setLoading(true);
      loadRunDetails().finally(() => setLoading(false));
    }
  }, [isAuthenticated, workspaceId, runId, loadRunDetails, run]);

  // Poll for status updates when any execution is running
  useEffect(() => {
    const hasRunningExecution = executions.some(e => e.status === "running");
    if (!hasRunningExecution) return;

    const pollInterval = setInterval(() => {
      loadRunDetails();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [executions, loadRunDetails]);

  // Smart collapse logic
  useEffect(() => {
    const hasSections = sections.length > 0;
    const hasCompleteTruthSets = truthSets.length > 0 && truthSets.every(ts => ts.status === "complete");

    // Expand sections section if no sections defined
    setSectionsExpanded(!hasSections);

    // Expand truth sets if no truth sets or any incomplete
    setTruthSetsExpanded(!hasSections || !hasCompleteTruthSets);
  }, [sections, truthSets]);

  // Navigation handlers
  const handleBackToWorkspace = () => {
    router.push(`/ws/${workspaceId}?tab=2`);
  };

  const handleBackToWorkspaces = () => {
    router.push("/ws");
  };

  const handleEditSections = () => {
    router.push(`/ws/${workspaceId}/runs/${runId}/sections`);
  };

  const handleCreateTruthSet = () => {
    router.push(`/ws/${workspaceId}/runs/${runId}/truth-sets/new`);
  };

  const handleDownloadTemplate = async () => {
    if (!isAuthenticated || !run) return;

    try {
      const token = await authAdapter.getToken();
      if (!token) return;
      const client = createCoraAuthenticatedClient(token);

      const response = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/truth-set-template`)) as any;

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `truth-set-template-${runId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: "✅ Template downloaded successfully",
        severity: "success",
      });
    } catch (err: any) {
      console.error("Error downloading template:", err);
      setSnackbar({
        open: true,
        message: `❌ Failed to download template: ${err.message}`,
        severity: "error",
      });
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
  };

  const handlePreviewTruthSet = async (file: File) => {
    const token = await authAdapter.getToken();
    if (!token) throw new Error("Not authenticated");
    const client = createCoraAuthenticatedClient(token);

    const formData = new FormData();
    formData.append("file", file);

    const response = (await client.post(`/ws/${workspaceId}/optimization/runs/${runId}/truth-set-preview`, formData)) as any;
    return response.data;
  };

  const handleConfirmImport = async (file: File) => {
    const token = await authAdapter.getToken();
    if (!token) throw new Error("Not authenticated");
    const client = createCoraAuthenticatedClient(token);

    const formData = new FormData();
    formData.append("file", file);

    const response = (await client.post(`/ws/${workspaceId}/optimization/runs/${runId}/truth-set-upload`, formData)) as any;
    return response.data;
  };

  const handleUploadSuccess = () => {
    setSnackbar({
      open: true,
      message: "✅ Truth set imported successfully",
      severity: "success",
    });
    loadRunDetails();
  };

  const handleTruthSetClick = (tsId: string) => {
    router.push(`/ws/${workspaceId}/runs/${runId}/truth-sets/${tsId}`);
  };

  const handleOpenExecutionDialog = () => {
    setExecutionDialogOpen(true);
  };

  const handleCloseExecutionDialog = () => {
    setExecutionDialogOpen(false);
  };

  const handleStartExecution = async (params: ExecutionParameters) => {
    if (!isAuthenticated || !run) return;

    setExecutionLoading(true);
    try {
      const token = await authAdapter.getToken();
      if (!token) return;
      const client = createCoraAuthenticatedClient(token);

      // Create execution
      const createRes = (await client.post(`/ws/${workspaceId}/optimization/runs/${runId}/executions`, params)) as any;
      const executionId = createRes.data.execution_id;

      // Start execution
      await client.post(`/ws/${workspaceId}/optimization/runs/${runId}/executions/${executionId}/start`);

      setSnackbar({
        open: true,
        message: "✅ Execution started! Results will appear as processing completes.",
        severity: "success",
      });

      // Refresh run details
      await loadRunDetails();
    } catch (err: any) {
      console.error("Error starting execution:", err);
      setSnackbar({
        open: true,
        message: `❌ Failed to start execution: ${err.message}`,
        severity: "error",
      });
      throw err;
    } finally {
      setExecutionLoading(false);
    }
  };

  const handleViewExecutionResults = (executionId: string) => {
    // TODO: Navigate to execution results view or open modal
    console.log("View results for execution:", executionId);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Loading state
  if (authLoading || loading || wsLoading) {
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
        <Alert severity="warning">Please sign in to view run details.</Alert>
      </Container>
    );
  }

  // Error state
  if (error || !run) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || "Run not found"}</Alert>
        <Button onClick={handleBackToWorkspace} sx={{ mt: 2 }}>
          Back to Workspace
        </Button>
      </Container>
    );
  }

  const hasSections = sections.length > 0;
  const hasCompleteTruthSets = truthSets.length > 0 && truthSets.every(ts => ts.status === "complete");
  const canCreateExecution = hasSections && truthSets.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleBackToWorkspaces}
          sx={{ cursor: "pointer" }}
          aria-label="Navigate to workspaces"
        >
          {navLabelPlural}
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={handleBackToWorkspace}
          sx={{ cursor: "pointer" }}
          aria-label="Navigate to workspace"
        >
          {workspace?.name || "Workspace"}
        </Link>
        <Typography variant="body2" color="text.primary">
          {run.name || "Optimization Run"}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h5">{run.name || "Untitled Run"}</Typography>
              <Chip label={getStatusLabel(run.status)} size="small" color={getStatusColor(run.status)} />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip label={run.doc_type_name || "Unknown Doc Type"} size="small" variant="outlined" />
              <Chip label={run.criteria_set_name || "Unknown Criteria Set"} size="small" variant="outlined" />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                Created {new Date(run.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          {run.accuracy !== undefined && (
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">
                Best Accuracy
              </Typography>
              <Typography variant="h4" color="success.main">
                {Math.round(run.accuracy * 100)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Section 1: Response Sections (Collapsible) */}
      <CollapsibleSection
        title="Response Sections"
        subtitle="Define the structure of AI responses for evaluation criteria."
        expanded={sectionsExpanded}
        onToggle={setSectionsExpanded}
        collapsedSummary={
          hasSections ? (
            <Typography variant="body2" color="success.main">
              ✓ {sections.length} section{sections.length !== 1 ? "s" : ""} defined
            </Typography>
          ) : (
            <Typography variant="body2" color="warning.main">
              ⚠️ Configuration required
            </Typography>
          )
        }
        headerActions={
          <Button
            variant={hasSections ? "outlined" : "contained"}
            startIcon={hasSections ? <Edit /> : <Add />}
            onClick={handleEditSections}
            size="small"
          >
            {hasSections ? "Edit" : "Define"}
          </Button>
        }
      >
        {!hasSections ? (
          <Alert severity="info">
            Define response sections first. This determines what fields the AI will generate for each criterion
            evaluation.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {sections.map(section => (
              <Chip
                key={section.id}
                label={`${section.name} (${section.type})`}
                variant="outlined"
                size="small"
                color={section.required ? "primary" : "default"}
              />
            ))}
          </Box>
        )}
      </CollapsibleSection>

      {/* Section 2: Truth Sets (Collapsible) */}
      <CollapsibleSection
        title="Truth Sets"
        subtitle="Sample documents with manually evaluated criteria (the ground truth)."
        expanded={truthSetsExpanded}
        onToggle={setTruthSetsExpanded}
        collapsedSummary={
          hasCompleteTruthSets ? (
            <Typography variant="body2" color="success.main">
              ✓ {truthSets.length} truth set{truthSets.length !== 1 ? "s" : ""} complete
            </Typography>
          ) : truthSets.length > 0 ? (
            <Typography variant="body2" color="warning.main">
              ⚠️ {truthSets.filter(ts => ts.status === "complete").length}/{truthSets.length} complete
            </Typography>
          ) : (
            <Typography variant="body2" color="warning.main">
              ⚠️ No truth sets
            </Typography>
          )
        }
        headerActions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={handleDownloadTemplate} disabled={!hasSections} size="small">
              Download Template
            </Button>
            <Button variant="outlined" onClick={handleOpenUploadDialog} disabled={!hasSections} size="small">
              Upload
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateTruthSet}
              disabled={!hasSections}
              size="small"
            >
              New
            </Button>
          </Box>
        }
      >
        {!hasSections && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Define response sections before creating truth sets.
          </Alert>
        )}

        {truthSets.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Description sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No truth sets yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create truth sets by uploading documents and manually evaluating each criterion.
            </Typography>
          </Box>
        ) : (
          <List>
            {truthSets.map(ts => (
              <ListItem
                key={ts.id}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleTruthSetClick(ts.id)}
              >
                <ListItemText
                  primary={ts.document_name}
                  secondary={
                    <Box component="span">
                      {ts.completed_criteria} of {ts.total_criteria} criteria evaluated
                      <LinearProgress
                        variant="determinate"
                        value={ts.progress_pct}
                        sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={ts.status === "complete" ? "Complete" : `${ts.progress_pct}%`}
                    size="small"
                    color={ts.status === "complete" ? "success" : "default"}
                    icon={ts.status === "complete" ? <CheckCircle fontSize="small" /> : <Schedule fontSize="small" />}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </CollapsibleSection>

      {/* Section 3: Optimization Executions (Always Expanded) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h5">Optimization Executions</Typography>
            <Typography variant="body2" color="text.secondary">
              Generate and test prompts automatically using your truth sets.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<Add />}
            onClick={handleOpenExecutionDialog}
            disabled={!canCreateExecution}
          >
            New Execution
          </Button>
        </Box>

        {!canCreateExecution && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {!hasSections
              ? "Define response sections first."
              : truthSets.length === 0
              ? "Create at least one truth set."
              : "Ready to create executions."}
          </Alert>
        )}

        {executions.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No executions yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first execution to start optimizing prompts.
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={handleOpenExecutionDialog}
              disabled={!canCreateExecution}
            >
              Create First Execution
            </Button>
          </Box>
        ) : (
          <Box>
            {executions.map(execution => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                phases={phases[execution.id]}
                variations={variations[execution.id]}
                onViewResults={handleViewExecutionResults}
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Truth Set Upload Dialog */}
      <TruthSetUploadDialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        onUploadSuccess={handleUploadSuccess}
        onPreview={handlePreviewTruthSet}
        onConfirmImport={handleConfirmImport}
      />

      {/* Execution Parameter Dialog */}
      <ExecutionParameterDialog
        open={executionDialogOpen}
        onClose={handleCloseExecutionDialog}
        onStartExecution={handleStartExecution}
        executionNumber={executions.length + 1}
        loading={executionLoading}
      />
    </Container>
  );
}