"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createApiClient } from "@/lib/api-client";
import DocumentViewer from "@/components/DocumentViewer";
import CriteriaEvaluationForm from "@/components/CriteriaEvaluationForm";

/**
 * Document Evaluation Page
 * 
 * Split-screen layout for creating truth keys:
 * - Left panel: Document viewer with text selection
 * - Right panel: Criteria evaluation forms
 * 
 * Analysts manually evaluate each criterion, creating the "truth keys"
 * that are used to train and optimize AI evaluation prompts.
 */

interface DocumentGroup {
  id: string;
  name: string;
  primary_doc_id: string;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  content: string;
  content_type: string;
}

interface CriteriaItem {
  id: string;
  criteria_id: string;
  requirement: string;
  description?: string;
  order_index: number;
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

export default function EvaluateDocumentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const wsId = params?.wsId as string;
  const groupId = params?.groupId as string;

  // Data state
  const [documentGroup, setDocumentGroup] = useState<DocumentGroup | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [criteria, setCriteria] = useState<CriteriaItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);

  // Evaluation state
  const [evaluations, setEvaluations] = useState<Map<string, CriterionEvaluation>>(new Map());
  const [selectedText, setSelectedText] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && wsId && groupId) {
      loadEvaluationData();
    }
  }, [session, wsId, groupId]);

  const loadEvaluationData = async () => {
    if (!session?.accessToken || !wsId || !groupId) return;

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);

      // Load all data in parallel
      const [groupRes, docRes, criteriaRes, statusRes, existingRes] = await Promise.all([
        client.get(`/eval-opt/workspaces/${wsId}/samples/${groupId}`),
        client.get(`/eval-opt/workspaces/${wsId}/samples/${groupId}/document`),
        client.get(`/eval-opt/workspaces/${wsId}/criteria`),
        client.get(`/eval/status-options`),
        client.get(`/eval-opt/workspaces/${wsId}/samples/${groupId}/truth-keys`),
      ]);

      setDocumentGroup(groupRes.data);
      setDocument(docRes.data);
      setCriteria((criteriaRes.data || []).sort((a: CriteriaItem, b: CriteriaItem) => a.order_index - b.order_index));
      setStatusOptions(statusRes.data || []);

      // Load existing evaluations into map
      if (existingRes.data && Array.isArray(existingRes.data)) {
        const existingMap = new Map<string, CriterionEvaluation>();
        existingRes.data.forEach((tk: any) => {
          existingMap.set(tk.criteria_item_id, {
            criteria_item_id: tk.criteria_item_id,
            status_id: tk.truth_status_id,
            confidence: tk.truth_confidence,
            explanation: tk.truth_explanation,
            citations: tk.truth_citations || [],
          });
        });
        setEvaluations(existingMap);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load evaluation data");
      console.error("Error loading evaluation data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSelected = (text: string) => {
    setSelectedText(text);
  };

  const handleEvaluationChange = (evaluation: CriterionEvaluation) => {
    setEvaluations((prev) => {
      const newMap = new Map(prev);
      newMap.set(evaluation.criteria_item_id, evaluation);
      return newMap;
    });
  };

  const handleSaveAll = async () => {
    if (!session?.accessToken || !wsId || !groupId) return;

    // Validate all evaluations are complete
    const incompleteCount = criteria.filter((c) => {
      const eval_ = evaluations.get(c.id);
      return !eval_ || !eval_.status_id || !eval_.explanation?.trim();
    }).length;

    if (incompleteCount > 0) {
      setError(`${incompleteCount} criteria not yet evaluated. Please complete all evaluations before saving.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const client = createApiClient(session.accessToken);

      // Convert evaluations map to array of truth keys
      const truthKeys = Array.from(evaluations.values()).map((eval_) => ({
        criteria_item_id: eval_.criteria_item_id,
        truth_status_id: eval_.status_id,
        truth_confidence: eval_.confidence,
        truth_explanation: eval_.explanation,
        truth_citations: eval_.citations,
      }));

      await client.post(`/eval-opt/workspaces/${wsId}/samples/${groupId}/truth-keys`, {
        truth_keys: truthKeys,
      });

      setSuccessMessage("Truth keys saved successfully!");

      // Navigate back to workspace after brief delay
      setTimeout(() => {
        router.push(`/ws/${wsId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save truth keys");
      console.error("Error saving truth keys:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleBackToWorkspace = () => {
    router.push(`/ws/${wsId}`);
  };

  // Calculate progress
  const evaluatedCount = criteria.filter((c) => {
    const eval_ = evaluations.get(c.id);
    return eval_ && eval_.status_id && eval_.explanation?.trim();
  }).length;
  const progressPercent = criteria.length > 0 ? Math.round((evaluatedCount / criteria.length) * 100) : 0;

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Evaluate Document</h1>
        <p>Please sign in to evaluate documents.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1600px", margin: "0 auto" }}>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={handleBackToWorkspace}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back to Workspace
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid #ddd",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <button
              onClick={handleBackToWorkspace}
              style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: "transparent",
                color: "#007bff",
                border: "1px solid #007bff",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "1rem",
              }}
            >
              ← Back
            </button>
            <span style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
              Evaluate: {documentGroup?.name || "Document"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Progress Indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "150px",
                  height: "8px",
                  backgroundColor: "#e9ecef",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    backgroundColor: progressPercent === 100 ? "#28a745" : "#007bff",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: "0.875rem", color: "#666" }}>
                {evaluatedCount} of {criteria.length} ({progressPercent}%)
              </span>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAll}
              disabled={saving || progressPercent < 100}
              style={{
                padding: "0.5rem 1.5rem",
                backgroundColor: saving || progressPercent < 100 ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: saving || progressPercent < 100 ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {saving ? "Saving..." : "Save All Truth Keys"}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}
        {successMessage && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#d4edda",
              color: "#155724",
              borderRadius: "4px",
            }}
          >
            ✓ {successMessage}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Panel - Document Viewer */}
        <div style={{ width: "50%", borderRight: "1px solid #ddd", overflow: "hidden" }}>
          <DocumentViewer
            documentContent={document?.content || ""}
            documentName={document?.name || "Document"}
            onTextSelected={handleTextSelected}
          />
        </div>

        {/* Right Panel - Criteria Evaluation Forms */}
        <div style={{ width: "50%", overflow: "auto", padding: "1.5rem", backgroundColor: "#fafafa" }}>
          <h2 style={{ margin: "0 0 1rem 0" }}>Evaluation Criteria</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
            Evaluate each criterion below. Select text in the document to add citations.
          </p>

          {criteria.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "white",
                borderRadius: "8px",
                border: "1px solid #ddd",
              }}
            >
              <p style={{ color: "#666" }}>No criteria found for this workspace.</p>
            </div>
          ) : (
            criteria.map((criterion) => (
              <CriteriaEvaluationForm
                key={criterion.id}
                criterion={criterion}
                statusOptions={statusOptions}
                initialValue={evaluations.get(criterion.id)}
                selectedText={selectedText}
                onChange={handleEvaluationChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}