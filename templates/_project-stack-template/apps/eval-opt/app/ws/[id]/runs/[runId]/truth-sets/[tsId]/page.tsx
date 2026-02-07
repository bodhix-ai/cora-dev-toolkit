"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
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

interface CriterionEvaluation {
  criteria_item_id: string;
  status_id: string;
  confidence: number;
  explanation: string;
  citations: string[];
}

interface KBDocument {
  id: string;
  name: string;
  extracted_text?: string;
}

export default function TruthSetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wsId = params?.id as string;
  const runId = params?.runId as string;
  const tsId = params?.tsId as string;

  const { authAdapter, isAuthenticated, isLoading: authLoading } = useUser();

  // Data state
  const [truthSet, setTruthSet] = useState<TruthSet | null>(null);
  const [document, setDocument] = useState<KBDocument | null>(null);
  const [criteriaItems, setCriteriaItems] = useState<CriteriaItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Map<string, CriterionEvaluation>>(new Map());
  const [selectedText, setSelectedText] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch truth set data
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchData = async () => {
      try {
        const token = await authAdapter.getToken();
        const client = createCoraAuthenticatedClient(token);

        // Fetch truth set
        const tsResponse = await client.get(`/ws/${wsId}/optimization/runs/${runId}/truth-sets/${tsId}`);
        const ts = tsResponse.data;
        setTruthSet(ts);

        // Initialize evaluations from existing data
        if (ts.evaluations && Array.isArray(ts.evaluations)) {
          const evalMap = new Map<string, CriterionEvaluation>();
          ts.evaluations.forEach((e: CriterionEvaluation) => {
            evalMap.set(e.criteria_item_id, e);
          });
          setEvaluations(evalMap);
        }

        // Fetch document content
        if (ts.document_id) {
          const docResponse = await client.get(`/kb/documents/${ts.document_id}`);
          if (docResponse.data) {
            setDocument(docResponse.data);
          }
        }

        // Fetch criteria items
        const criteriaResponse = await client.get("/eval/criteria-items");
        if (criteriaResponse.data) {
          setCriteriaItems(criteriaResponse.data);
        }

        // Fetch status options
        const statusResponse = await client.get("/eval/status-options");
        if (statusResponse.data) {
          setStatusOptions(statusResponse.data);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load truth set");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [wsId, runId, tsId, isAuthenticated, authLoading, authAdapter]);

  const handleEvaluationChange = (evaluation: CriterionEvaluation) => {
    const newEvaluations = new Map(evaluations);
    newEvaluations.set(evaluation.criteria_item_id, evaluation);
    setEvaluations(newEvaluations);
    setHasChanges(true);
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = await authAdapter.getToken();
      const client = createCoraAuthenticatedClient(token);
      await client.put(`/ws/${wsId}/optimization/runs/${runId}/truth-sets/${tsId}`, {
        evaluations: Array.from(evaluations.values()),
      });

      setHasChanges(false);
      alert("Changes saved successfully!");
    } catch (err) {
      console.error("Error saving evaluations:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return;
      }
    }
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
        <button onClick={handleBack}>← Back to Run Details</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={handleBack}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{ margin: "0 0 0.5rem 0" }}>{truthSet.name}</h1>
            <p style={{ color: "#666", margin: 0 }}>
              Edit evaluations for this truth set. Changes will be saved when you click Save.
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
            {hasChanges && (
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  backgroundColor: "#ffc107",
                  color: "#212529",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                }}
              >
                Unsaved Changes
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
          <DocumentViewer
            documentContent={document?.extracted_text || "Loading document..."}
            documentName={document?.name || truthSet.name}
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

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: saving || !hasChanges ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: saving || !hasChanges ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}