"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import { useKbDocuments, createKbModuleClient, createAuthenticatedClient } from "@{{PROJECT_NAME}}/module-kb";
import DocumentViewer from "../../../../../../../components/DocumentViewer";
import CriteriaEvaluationForm from "../../../../../../../components/CriteriaEvaluationForm";

interface KBDocument {
  id: string;
  kbId: string;
  filename: string;
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  mimeType: string;
  status: string;
  errorMessage: string | null;
  chunkCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  createdBy: string;
  extractedText?: string;
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

interface CriterionEvaluation {
  criteria_item_id: string;
  status_id: string;
  confidence: number;
  explanation: string;
  citations: string[];
}

export default function NewTruthSetPage() {
  const params = useParams();
  const router = useRouter();
  const wsId = params?.id as string;
  const runId = params?.runId as string;

  const { authAdapter, isAuthenticated, isLoading: authLoading } = useUser();

  // KB documents hook for upload/list functionality
  // Create API client wrapper for KB module
  const [apiClientWrapper, setApiClientWrapper] = useState<{ kb: ReturnType<typeof createKbModuleClient> } | null>(null);

  // Initialize API client when auth is ready
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setApiClientWrapper(null);
      return;
    }
    
    // Create API client wrapper
    const initClient = async () => {
      try {
        const token = await authAdapter.getToken();
        if (token) {
          const authenticatedClient = createAuthenticatedClient(token);
          const kbClient = createKbModuleClient(authenticatedClient);
          setApiClientWrapper({ kb: kbClient });
        }
      } catch (err) {
        console.error('Failed to initialize KB API client:', err);
        setApiClientWrapper(null);
      }
    };
    
    initClient();
  }, [authAdapter, isAuthenticated]);

  const { 
    documents, 
    uploadDocument, 
    uploading,
    refresh: refreshDocuments,
    loading: docsLoading
  } = useKbDocuments({
    scope: 'workspace',
    scopeId: wsId,
    apiClient: apiClientWrapper as any,
    autoFetch: isAuthenticated && !!apiClientWrapper,
  });

  // Wizard step state
  const [step, setStep] = useState<"document" | "evaluate">("document");

  // Step 1: Document selection
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<KBDocument | null>(null);
  const [truthSetName, setTruthSetName] = useState("");

  // Step 2: Evaluation
  const [criteriaSetId, setCriteriaSetId] = useState<string>("");
  const [criteriaItems, setCriteriaItems] = useState<CriteriaItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Map<string, CriterionEvaluation>>(new Map());
  const [selectedText, setSelectedText] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truthSetId, setTruthSetId] = useState<string | null>(null);

  // Initialize loading state
  useEffect(() => {
    if (!authLoading && apiClientWrapper) {
      setLoading(false);
    }
  }, [authLoading, apiClientWrapper]);

  // Fetch run details on mount to get criteria set ID
  useEffect(() => {
    if (!isAuthenticated || !runId || !wsId) return;

    const fetchRunDetails = async () => {
      try {
        const token = await authAdapter.getToken();
        const client = createCoraAuthenticatedClient(token);

        const response = await client.get(`/ws/${wsId}/optimization/runs/${runId}`);
        if (response.data?.criteriaSetId) {
          setCriteriaSetId(response.data.criteriaSetId);
        }
      } catch (err) {
        console.error("Error fetching run details:", err);
        setError("Failed to load optimization run details");
      }
    };

    fetchRunDetails();
  }, [isAuthenticated, runId, wsId, authAdapter]);

  // Fetch criteria and status options when entering evaluation step
  useEffect(() => {
    if (step !== "evaluate" || !isAuthenticated || !criteriaSetId) return;

    const fetchCriteriaAndStatus = async () => {
      try {
        const token = await authAdapter.getToken();
        const client = createCoraAuthenticatedClient(token);

        // Fetch criteria items for the run's criteria set
        const criteriaResponse = await client.get(
          `/ws/${wsId}/eval/config/criteria-sets/${criteriaSetId}/items`
        );
        if (criteriaResponse.data) {
          setCriteriaItems(criteriaResponse.data);
        }

        // Fetch status options
        const statusResponse = await client.get("/eval/status-options");
        if (statusResponse.data) {
          setStatusOptions(statusResponse.data);
        }
      } catch (err) {
        console.error("Error fetching criteria/status:", err);
        setError("Failed to load criteria items");
      }
    };

    fetchCriteriaAndStatus();
  }, [step, isAuthenticated, criteriaSetId, wsId, authAdapter]);

  // Fetch full document content when selected
  useEffect(() => {
    if (!selectedDocId || !isAuthenticated || !apiClientWrapper) return;

    const fetchDocContent = async () => {
      try {
        const response = await apiClientWrapper.kb.workspace.getDocument(wsId, selectedDocId);
        if (response.data) {
          setSelectedDoc(response.data);
        }
      } catch (err) {
        console.error("Error fetching document content:", err);
        // Fallback: try to find in the list, though it might not have content
        const docInList = documents.find((d) => d.id === selectedDocId);
        if (docInList) {
          setSelectedDoc(docInList as unknown as KBDocument);
        }
      }
    };

    fetchDocContent();
  }, [selectedDocId, isAuthenticated, apiClientWrapper, wsId, documents]);

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocId(docId);
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      setTruthSetName(doc.filename);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    try {
      // Upload all selected files using the KB hook
      const uploadedDocs: KBDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const doc = await uploadDocument(file);
        if (doc) {
            uploadedDocs.push(doc as unknown as KBDocument);
        }
      }

      // Auto-select the first uploaded document
      if (uploadedDocs.length > 0) {
        const firstDoc = uploadedDocs[0];
        setSelectedDocId(firstDoc.id);
        setTruthSetName(firstDoc.filename);
      }

      // Reset file input
      event.target.value = "";
    } catch (err) {
      console.error("Error uploading documents:", err);
      setError(err instanceof Error ? err.message : "Failed to upload documents");
    }
  };

  const handleProceedToEvaluation = async () => {
    if (!selectedDocId || !truthSetName.trim()) {
      setError("Please select a document and provide a name");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await authAdapter.getToken();
      const client = createCoraAuthenticatedClient(token);
      const response = await client.post(`/ws/${wsId}/optimization/runs/${runId}/truth-sets`, {
        name: truthSetName,
        document_id: selectedDocId,
      });

      setTruthSetId(response.data?.id);
      setStep("evaluate");
    } catch (err) {
      console.error("Error creating truth set:", err);
      setError(err instanceof Error ? err.message : "Failed to create truth set");
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluationChange = (evaluation: CriterionEvaluation) => {
    const newEvaluations = new Map(evaluations);
    newEvaluations.set(evaluation.criteria_item_id, evaluation);
    setEvaluations(newEvaluations);
  };

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

  const handleSaveProgress = async () => {
    if (!truthSetId) return;

    setSaving(true);
    setError(null);

    try {
      const token = await authAdapter.getToken();
      const client = createCoraAuthenticatedClient(token);
      await client.put(`/ws/${wsId}/optimization/runs/${runId}/truth-sets/${truthSetId}`, {
        evaluations: Array.from(evaluations.values()),
      });

      alert("Progress saved successfully!");
    } catch (err) {
      console.error("Error saving evaluations:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!truthSetId) return;

    setSaving(true);
    setError(null);

    try {
      const token = await authAdapter.getToken();
      const client = createCoraAuthenticatedClient(token);
      await client.put(`/ws/${wsId}/optimization/runs/${runId}/truth-sets/${truthSetId}`, {
        evaluations: Array.from(evaluations.values()),
      });

      router.push(`/ws/${wsId}/runs/${runId}`);
    } catch (err) {
      console.error("Error completing truth set:", err);
      setError(err instanceof Error ? err.message : "Failed to complete");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
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

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={handleCancel}
          style={{
            background: "none",
            border: "none",
            color: "#007bff",
            cursor: "pointer",
            fontSize: "1rem",
            padding: 0,
            marginBottom: "1rem",
          }}
        >
          ← Back to Run Details
        </button>
        <h1 style={{ margin: "0 0 0.5rem 0" }}>
          {step === "document" ? "Step 1: Select Document" : "Step 2: Evaluate Criteria"}
        </h1>
        <p style={{ color: "#666", margin: 0 }}>
          {step === "document"
            ? "Choose a document from the workspace knowledge base to create a truth set."
            : "Evaluate each criterion against the document to establish ground truth."}
        </p>
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

      {/* Step 1: Document Selection */}
      {step === "document" && (
        <div>
          <div
            style={{
              padding: "1.5rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "white",
            }}
          >
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem" }}>Select Document</h2>

            {/* Upload Button */}
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <label
                htmlFor="file-upload"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: uploading ? "#ccc" : "#28a745",
                  color: "white",
                  borderRadius: "4px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  border: "none",
                }}
              >
                {uploading ? "Uploading..." : "+ Upload Document(s)"}
              </label>
              <span style={{ marginLeft: "1rem", color: "#666", fontSize: "0.875rem" }}>
                Supports PDF, Word, and text files. Multiple files allowed.
              </span>
            </div>

            {documents.length === 0 && !docsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                <p>No documents found in the workspace knowledge base.</p>
                <p>Upload documents using the button above or via the Context tab.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label htmlFor="document-select" className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>
                  Select a document
                </label>
                <select
                  id="document-select"
                  value={selectedDocId}
                  onChange={(e) => handleDocumentSelect(e.target.value)}
                  disabled={docsLoading}
                  aria-label="Select a document"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                >
                  <option value="">{docsLoading ? "Loading documents..." : "-- Select a document --"}</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.mimeType})
                    </option>
                  ))}
                </select>

                <div>
                  <label htmlFor="truth-set-name" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
                    Truth Set Name
                  </label>
                  <input
                    type="text"
                    id="truth-set-name"
                    value={truthSetName}
                    onChange={(e) => setTruthSetName(e.target.value)}
                    placeholder="Enter a name for this truth set..."
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleProceedToEvaluation}
              disabled={!selectedDocId || !truthSetName.trim() || saving}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor:
                  !selectedDocId || !truthSetName.trim() || saving ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  !selectedDocId || !truthSetName.trim() || saving ? "not-allowed" : "pointer",
                fontSize: "1rem",
              }}
            >
              {saving ? "Creating..." : "Continue to Evaluation →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Evaluation */}
      {step === "evaluate" && (
        <div>
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
              <DocumentViewer
                documentContent={selectedDoc?.extractedText || "Loading document..."}
                documentName={selectedDoc?.filename || truthSetName}
                onTextSelected={setSelectedText}
              />
            </div>

            {/* Right: Evaluation Form */}
            <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
              {currentCriterion ? (
                <CriteriaEvaluationForm
                  criterion={currentCriterion}
                  statusOptions={statusOptions}
                  initialValue={evaluations.get(currentCriterion.id)}
                  selectedText={selectedText}
                  onChange={handleEvaluationChange}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                  <p>No criteria items found.</p>
                </div>
              )}

              {/* Navigation Buttons */}
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
              onClick={handleCancel}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleSaveProgress}
                disabled={saving || evaluatedCount === 0}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "white",
                  border: "1px solid #007bff",
                  color: "#007bff",
                  borderRadius: "4px",
                  cursor: saving || evaluatedCount === 0 ? "not-allowed" : "pointer",
                  opacity: saving || evaluatedCount === 0 ? 0.5 : 1,
                  fontSize: "1rem",
                }}
              >
                {saving ? "Saving..." : "Save Progress"}
              </button>
              <button
                onClick={handleComplete}
                disabled={saving || evaluatedCount < totalCount}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: saving || evaluatedCount < totalCount ? "#ccc" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: saving || evaluatedCount < totalCount ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                }}
              >
                {saving ? "Completing..." : "Complete Truth Set"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}