"use client";

/**
 * Eval Optimizer - Optimization Run Details Page
 *
 * Route: /ws/[id]/runs/[runId]
 * Displays run details with three sections:
 * - Response Sections: Define/edit AI response structure
 * - Truth Sets: List and create truth sets
 * - Optimization: Trigger optimization and view results
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
  Grid,
  Chip,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  PlayArrow,
  Description,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
} from "@mui/icons-material";
import OptimizationResults from "@/components/OptimizationResults";
import OptimizationStepper from "@/components/OptimizationStepper";
import VariationProgressTable from "@/components/VariationProgressTable";

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
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [variations, setVariations] = useState<VariationProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

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

    // Don't set loading state if we already have data (polling)
    // Only set loading on initial fetch if run is null
    // But we can't access state easily inside callback without deps
    // So we'll skip the loading indicator for polling updates

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

      // Load phase data (if run is in progress)
      if (runRes.data.status === "pending" || runRes.data.status === "processing") {
        try {
          const phasesRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/phases`)) as any;
          setPhases(phasesRes.data || []);
        } catch (phaseErr) {
          // Phases endpoint might not exist yet, silently fail
          console.warn("Phase data not available:", phaseErr);
        }

        // Load variation progress (if in Phase 4 - evaluation loop)
        if (runRes.data.currentPhase === 4) {
          try {
            const variationsRes = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/variations`)) as any;
            setVariations(variationsRes.data || []);
          } catch (varErr) {
            // Variations endpoint might not exist yet, silently fail
            console.warn("Variation data not available:", varErr);
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading run details:", err);
      // Only set error on initial load failure
      // setError(err.message || "Failed to load run details");
    }
  }, [workspaceId, runId]); // Removed authAdapter and isAuthenticated

  // Initial load
  useEffect(() => {
    if (isAuthenticated && workspaceId && runId && !run) {
      setLoading(true);
      loadRunDetails().finally(() => setLoading(false));
    }
  }, [isAuthenticated, workspaceId, runId, loadRunDetails, run]);

  // Poll for status updates when run is in progress
  useEffect(() => {
    if (!run || (run.status !== "pending" && run.status !== "processing")) return;

    const pollInterval = setInterval(() => {
      loadRunDetails();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [run?.status, loadRunDetails]);

  // Navigation handlers
  const handleBackToWorkspace = () => {
    router.push(`/ws/${workspaceId}?tab=2`); // Go to Optimization tab
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

  const handleTruthSetClick = (tsId: string) => {
    router.push(`/ws/${workspaceId}/runs/${runId}/truth-sets/${tsId}`);
  };

  const handleStartOptimization = async () => {
    if (!isAuthenticated || !run) return;

    setOptimizing(true);
    try {
      const token = await authAdapter.getToken();
      if (!token) return;
      const client = createCoraAuthenticatedClient(token);

      await client.post(`/ws/${workspaceId}/optimization/runs/${runId}/optimize`);

      // Show success notification
      setSnackbar({
        open: true,
        message: "✅ Optimization started! Results will appear as processing completes.",
        severity: "success",
      });

      // Refresh run details to get updated status
      await loadRunDetails();
    } catch (err: any) {
      console.error("Error starting optimization:", err);
      const errorMsg = err.message || "Failed to start optimization";
      setError(errorMsg);
      setSnackbar({
        open: true,
        message: `❌ ${errorMsg}`,
        severity: "error",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLoadResults = async () => {
    const token = await authAdapter.getToken();
    if (!token) throw new Error("Not authenticated");
    const client = createCoraAuthenticatedClient(token);

    const res = (await client.get(`/ws/${workspaceId}/optimization/runs/${runId}/results`)) as any;
    return res.data;
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
  const hasTruthSets = truthSets.length > 0;
  const canOptimize = hasSections && hasTruthSets && run.status !== "pending" && run.status !== "processing";

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
              <Chip
                label={getStatusLabel(run.status)}
                size="small"
                color={getStatusColor(run.status)}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={run.doc_type_name || "Unknown Doc Type"}
                size="small"
                variant="outlined"
              />
              <Chip
                label={run.criteria_set_name || "Unknown Criteria Set"}
                size="small"
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                Created {new Date(run.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          {run.accuracy !== undefined && (
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">
                Accuracy
              </Typography>
              <Typography variant="h4" color="success.main">
                {Math.round(run.accuracy * 100)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Three-Section Layout */}
      <Grid container spacing={3}>
        {/* Section 1: Response Sections */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h5">Response Sections</Typography>
                <Typography variant="body2" color="text.secondary">
                  Define the structure of AI responses for evaluation criteria.
                </Typography>
              </Box>
              <Button
                variant={hasSections ? "outlined" : "contained"}
                startIcon={hasSections ? <Edit /> : <Add />}
                onClick={handleEditSections}
              >
                {hasSections ? "Edit Sections" : "Define Sections"}
              </Button>
            </Box>

            {!hasSections ? (
              <Alert severity="info">
                Define response sections first. This determines what fields the AI will generate
                for each criterion evaluation.
              </Alert>
            ) : (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {sections.map((section) => (
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
          </Paper>
        </Grid>

        {/* Section 2: Truth Sets */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h5">Truth Sets</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sample documents with manually evaluated criteria (the "ground truth").
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateTruthSet}
                disabled={!hasSections}
              >
                New Truth Set
              </Button>
            </Box>

            {!hasSections && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Define response sections before creating truth sets.
              </Alert>
            )}

            {!hasTruthSets ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Description sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  No truth sets yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create truth sets by uploading documents and manually evaluating each criterion.
                </Typography>
              </Box>
            ) : (
              <List>
                {truthSets.map((ts) => (
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
                        icon={
                          ts.status === "complete" ? (
                            <CheckCircle fontSize="small" />
                          ) : (
                            <Schedule fontSize="small" />
                          )
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Section 3: Optimization */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h5">Optimization</Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate and test prompts automatically using your truth sets.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="success"
                startIcon={optimizing ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={handleStartOptimization}
                disabled={!canOptimize || optimizing}
              >
                {optimizing ? "Optimizing..." : "Optimize Eval Config"}
              </Button>
            </Box>

            {!canOptimize && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {!hasSections
                  ? "Define response sections first."
                  : !hasTruthSets
                  ? "Create at least one truth set."
                  : (run.status === "pending" || run.status === "processing")
                  ? "Optimization is already running."
                  : "Ready to optimize."}
              </Alert>
            )}

            {(run.status === "pending" || run.status === "processing") && (
              <Box sx={{ py: 3 }}>
                {/* 5-Phase Progress Stepper */}
                <OptimizationStepper
                  currentPhase={run.currentPhase || 1}
                  currentPhaseName={run.currentPhaseName || ""}
                  status={run.status}
                  phases={phases}
                  progressMessage={run.progressMessage}
                />

                {/* Variation Progress Table (only show in Phase 4) */}
                {run.currentPhase === 4 && variations.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Prompt Variations
                    </Typography>
                    <VariationProgressTable
                      variations={variations}
                      loading={run.status === "processing"}
                    />
                  </Box>
                )}
              </Box>
            )}

            {run.status === "completed" && (
              <>
                <Alert severity="success" icon={<CheckCircle />}>
                  <Typography variant="subtitle2">Optimization Complete!</Typography>
                  <Typography variant="body2">
                    Best configuration achieved {Math.round((run.accuracy || 0) * 100)}% accuracy.
                    View detailed results below.
                  </Typography>
                </Alert>

                <OptimizationResults
                  runId={runId}
                  workspaceId={workspaceId}
                  onLoadResults={handleLoadResults}
                />
              </>
            )}

            {run.status === "failed" && (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2">Optimization Failed</Typography>
                <Typography variant="body2">
                  Please check your truth sets and try again.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

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
    </Container>
  );
}
