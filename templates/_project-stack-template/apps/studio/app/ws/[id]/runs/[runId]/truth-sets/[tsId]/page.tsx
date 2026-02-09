"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { useWorkspace } from "@{{PROJECT_NAME}}/module-ws";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import { createKbModuleClient } from "@{{PROJECT_NAME}}/module-kb";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import DocumentViewer from "../../../../../../../components/DocumentViewer";
import CriteriaEvaluationForm from "../../../../../../../components/CriteriaEvaluationForm";

interface TruthSet {
  id: string;
  name: string;
  document_id: string;
  status: string;
  evaluations: CriterionEvaluation[];
}

interface CriteriaItem {
  id: string;
  criteria_id: string;
  requirement: string;
  description?: string;
}

interface StatusOption {
  id: string;
  name: string;
  description?: string;
}

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'boolean';
}

interface ResponseSection {
  id: string;
  name: string;
  type: 'number' | 'text' | 'list' | 'boolean' | 'object' | 'table';
  required: boolean;
  description?: string;
  columns?: TableColumn[];
}

interface CriterionEvaluation {
  criteria_item_id: string;
  section_responses: Record<string, any>;
}

interface KBDocument {
  id: string;
  name: string;
  extracted_text?: string;
  content?: string;
  text_content?: string;
}

interface DownloadUrlResult {
  downloadUrl: string;
  expiresIn: number;
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleTimeString();
}

export default function TruthSetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wsId = params?.id as string;
  const runId = params?.runId as string;
  const tsId = params?.tsId as string;

  const { authAdapter, isAuthenticated, isLoading: authLoading } = useUser();
  const { orgId, organization } = useOrganizationContext();
  const { workspace } = useWorkspace(wsId, { autoFetch: true, orgId });

  // Data state
  const [truthSet, setTruthSet] = useState<TruthSet | null>(null);
  const [document, setDocument] = useState<KBDocument | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [criteriaItems, setCriteriaItems] = useState<CriteriaItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [responseSections, setResponseSections] = useState<ResponseSection[]>([]);
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Map<string, CriterionEvaluation>>(new Map());
  const [selectedText, setSelectedText] = useState("");
  const [runName, setRunName] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Auto-save refs
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusFadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch truth set data
  useEffect(() => {
    if (!isAuthenticated || authLoading || !orgId) return;

    const fetchData = async () => {
      try {
        const token = await authAdapter.getToken();
        if (!token) {
          setError("Authentication token not available");
          setLoading(false);
          return;
        }
        const client = createCoraAuthenticatedClient(token);

        // Fetch optimization run to get criteria_set_id and response sections
        const runResponse = await client.get(`/ws/${wsId}/optimization/runs/${runId}`);
        const run = (runResponse as any).data;
        if (run.name) setRunName(run.name);
        
        // Lambda returns camelCase field names
        const criteriaSetId = run.criteriaSetId;
        
        if (!criteriaSetId) {
          console.error("No criteriaSetId found in run response:", run);
          setError("Run is missing criteria set configuration. Cannot load criteria items.");
          setLoading(false);
          return;
        }

        // Get response sections from run response (embedded inline)
        if (run.responseSections && Array.isArray(run.responseSections)) {
          setResponseSections(run.responseSections);
        }

        // Fetch truth set
        const tsResponse = await client.get(`/ws/${wsId}/optimization/runs/${runId}/truth-sets/${tsId}`);
        const ts = (tsResponse as any).data;
        setTruthSet(ts);

        // Initialize evaluations from existing data
        if (ts.evaluations && Array.isArray(ts.evaluations)) {
          const evalMap = new Map<string, CriterionEvaluation>();
          ts.evaluations.forEach((e: CriterionEvaluation) => {
            evalMap.set(e.criteria_item_id, e);
          });
          setEvaluations(evalMap);
        }

        // Fetch document metadata and presigned URL for viewing
        if (ts.document_id) {
          const kbClient = createKbModuleClient(client);
          
          // Get document metadata (filename, status, etc.)
          const docResponse = await kbClient.workspace.getDocument(wsId, ts.document_id);
          if (docResponse.data) {
            setDocument(docResponse.data as any);
          }

          // Note: Download URL fetched on-demand when user clicks "View Document"
          // to avoid triggering browser download dialog on page load
        }

        // Fetch criteria items using workspace-scoped route
        const criteriaResponse = await client.get(`/ws/${wsId}/eval/config/criteria-sets/${criteriaSetId}/items`);
        if ((criteriaResponse as any).data) {
          setCriteriaItems((criteriaResponse as any).data);
        }

        // Status options removed — Sprint 5 uses rubric-based scoring (0-100)
        // BA provides score directly, status label derived from rubric
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load truth set");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [wsId, runId, tsId, isAuthenticated, authLoading, authAdapter, orgId]);

  // Auto-save function with debounce
  const performSave = useCallback(async (evaluationsToSave: Map<string, CriterionEvaluation>) => {
    setSaveStatus('saving');
    setError(null);

    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setSaveStatus('error');
        setError("Authentication token not available");
        return;
      }
      const client = createCoraAuthenticatedClient(token);
      await client.put(`/ws/${wsId}/optimization/runs/${runId}/truth-sets/${tsId}`, {
        evaluations: Array.from(evaluationsToSave.values()),
      });

      setHasChanges(false);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      
      // Fade out "Saved" status after 3 seconds
      if (statusFadeTimerRef.current) {
        clearTimeout(statusFadeTimerRef.current);
      }
      statusFadeTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      console.error("Error auto-saving evaluations:", err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : "Failed to auto-save");
    }
  }, [wsId, runId, tsId, authAdapter]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(() => {
      performSave(evaluations);
    }, 500); // 500ms debounce
  }, [evaluations, performSave]);

  const handleEvaluationChange = (evaluation: CriterionEvaluation) => {
    const newEvaluations = new Map(evaluations);
    newEvaluations.set(evaluation.criteria_item_id, evaluation);
    setEvaluations(newEvaluations);
    setHasChanges(true);
  };

  // Handler for field blur (triggers auto-save)
  const handleFieldBlur = () => {
    if (hasChanges) {
      triggerAutoSave();
    }
  };
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (statusFadeTimerRef.current) {
        clearTimeout(statusFadeTimerRef.current);
      }
    };
  }, []);

  const handlePrevious = () => {
    if (currentCriterionIndex > 0) {
      setCurrentCriterionIndex(currentCriterionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentCriterionIndex < criteriaItems.length - 1) {
      setCurrentCriterionIndex(currentCriterionIndex + 1);
    }
  };

  // Manual save handler (fallback)
  const handleSave = async () => {
    setSaving(true);
    await performSave(evaluations);
    setSaving(false);
  };

  const handleBack = () => {
    // Auto-save handles persistence, so no need to warn about unsaved changes
    router.push(`/ws/${wsId}/runs/${runId}`);
  };

  const currentCriterion = criteriaItems[currentCriterionIndex];
  const evaluatedCount = evaluations.size;
  const totalCount = criteriaItems.length;
  const progressPct = totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Please sign in to continue.</p>
      </div>
    );
  }

  if (!truthSet) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Truth set not found.</p>
        <button onClick={handleBack} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer" }}>← Back to Run Details</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: "2rem" }}>
        <nav style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
          <a
            onClick={() => router.push("/ws")}
            style={{ color: "#007bff", cursor: "pointer", textDecoration: "none" }}
          >Workspaces</a>
          <span style={{ margin: "0 0.5rem", color: "#999" }}>/</span>
          <a
            onClick={() => router.push(`/ws/${wsId}?tab=2`)}
            style={{ color: "#007bff", cursor: "pointer", textDecoration: "none" }}
          >{workspace?.name || "Workspace"}</a>
          <span style={{ margin: "0 0.5rem", color: "#999" }}>/</span>
          <a
            onClick={handleBack}
            style={{ color: "#007bff", cursor: "pointer", textDecoration: "none" }}
          >{runName || "Optimization Run"}</a>
          <span style={{ margin: "0 0.5rem", color: "#999" }}>/</span>
          <span style={{ color: "#333" }}>Truth Set</span>
        </nav>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{ margin: "0 0 0.5rem 0" }}>{truthSet.name}</h1>
            <p style={{ color: "#666", margin: 0 }}>
              Edit evaluations for this truth set. Changes are saved automatically.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: truthSet.status === "complete" ? "#d4edda" : "#fff3cd",
                color: truthSet.status === "complete" ? "#155724" : "#856404",
                borderRadius: "4px",
                fontSize: "0.875rem",
                fontWeight: "bold",
              }}
            >
              {truthSet.status === "complete" ? "✓ COMPLETE" : "IN PROGRESS"}
            </span>
            {/* Auto-save status indicator */}
            {saveStatus === 'saving' && (
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  backgroundColor: "#17a2b8",
                  color: "white",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span style={{ animation: "spin 1s linear infinite" }}>⟳</span> Saving...
              </span>
            )}
            {saveStatus === 'saved' && lastSavedAt && (
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  backgroundColor: "#28a745",
                  color: "white",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                }}
              >
                ✓ Saved {formatTimeAgo(lastSavedAt)}
              </span>
            )}
            {saveStatus === 'error' && (
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                }}
              >
                ✗ Save failed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            color: "#721c24",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Progress Bar */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span>
            Criterion {currentCriterionIndex + 1} of {totalCount}
          </span>
          <span style={{ fontWeight: "bold" }}>
            {evaluatedCount} of {totalCount} evaluated ({progressPct}%)
          </span>
        </div>
        <div
          style={{
            height: "8px",
            backgroundColor: "#e9ecef",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              backgroundColor: progressPct === 100 ? "#28a745" : "#007bff",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Split Layout */}
      <div style={{ display: "flex", gap: "1.5rem", height: "600px" }}>
        {/* Left: Document Viewer */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #ddd",
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}>
            {/* Header */}
            <div style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #ddd",
              backgroundColor: "#f8f9fa",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{ fontSize: "1.1rem" }}>📄</span>
              <strong style={{ fontSize: "0.9rem" }}>{document?.name || truthSet.name}</strong>
            </div>
            {/* Content */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              textAlign: "center",
              color: "#555",
            }}>
              <p style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                Open the document in a new tab to review while evaluating criteria.
              </p>
              <button
                onClick={async () => {
                  try {
                    const token = await authAdapter.getToken();
                    if (!token) return;
                    const c = createCoraAuthenticatedClient(token);
                    const kbClient = createKbModuleClient(c);
                    const resp = await kbClient.workspace.downloadDocument(wsId, document?.id || "");
                    if (resp.data && (resp.data as any).downloadUrl) {
                      window.open((resp.data as any).downloadUrl, "_blank");
                    }
                  } catch (err) {
                    console.error("Failed to get download URL:", err);
                  }
                }}
                disabled={!document?.id}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.95rem",
                  backgroundColor: document?.id ? "#1976d2" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: document?.id ? "pointer" : "not-allowed",
                }}
              >
                📥 View Document in New Tab
              </button>
              <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "1rem" }}>
                Tip: Arrange browser windows side-by-side for efficient evaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Evaluation Form */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {/* Top Pagination - Quick Jump */}
          {criteriaItems.length > 0 && (
            <div style={{ 
              padding: "0.75rem 1rem", 
              backgroundColor: "#f8f9fa", 
              borderRadius: "8px", 
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Stack spacing={2}>
                <Pagination
                  count={criteriaItems.length}
                  page={currentCriterionIndex + 1}
                  onChange={(event, page) => setCurrentCriterionIndex(page - 1)}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  boundaryCount={1}
                />
              </Stack>
            </div>
          )}

          {currentCriterion ? (
            <CriteriaEvaluationForm
              criterion={currentCriterion}
              responseSections={responseSections}
              initialValue={evaluations.get(currentCriterion.id)}
              selectedText={selectedText}
              onChange={handleEvaluationChange}
              onBlur={handleFieldBlur}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              <p>No criteria items found.</p>
            </div>
          )}

          {/* Bottom Navigation Buttons - Sequential */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              onClick={handlePrevious}
              disabled={currentCriterionIndex === 0}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: currentCriterionIndex === 0 ? "not-allowed" : "pointer",
                opacity: currentCriterionIndex === 0 ? 0.5 : 1,
              }}
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentCriterionIndex === criteriaItems.length - 1}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor:
                  currentCriterionIndex === criteriaItems.length - 1 ? "not-allowed" : "pointer",
                opacity: currentCriterionIndex === criteriaItems.length - 1 ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          marginTop: "1.5rem",
          paddingTop: "1rem",
          borderTop: "1px solid #ddd",
          display: "flex",
          gap: "1rem",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          ← Back
        </button>

        {/* Manual save fallback button - auto-save handles persistence automatically */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: saving ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {saving ? "Saving..." : "Save Now"}
        </button>
      </div>
    </div>
  );
}