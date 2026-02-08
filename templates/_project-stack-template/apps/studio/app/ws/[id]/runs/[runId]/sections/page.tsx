"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import ResponseStructureBuilder from "../../../../../../components/ResponseStructureBuilder";

interface ResponseSection {
  id: string;
  name: string;
  description: string;
  type: "text" | "list" | "object" | "number" | "boolean";
  required: boolean;
}

export default function ResponseSectionsPage() {
  const params = useParams();
  const router = useRouter();
  const wsId = params?.id as string;
  const runId = params?.runId as string;

  const { authAdapter, isAuthenticated, isLoading: authLoading } = useUser();
  const [sections, setSections] = useState<ResponseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing sections
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchSections = async () => {
      try {
        const token = await authAdapter.getToken();
        const client = createCoraAuthenticatedClient(token);
        const response = await client.get(`/ws/${wsId}/optimization/runs/${runId}/sections`);

        if (response.data && Array.isArray(response.data)) {
          setSections(response.data);
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
        setError(err instanceof Error ? err.message : "Failed to load sections");
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [wsId, runId, isAuthenticated, authLoading, authAdapter]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = await authAdapter.getToken();
      const client = createCoraAuthenticatedClient(token);
      await client.put(`/ws/${wsId}/optimization/runs/${runId}/sections`, { sections });

      // Navigate back to run details
      router.push(`/ws/${wsId}/runs/${runId}`);
    } catch (err) {
      console.error("Error saving sections:", err);
      setError(err instanceof Error ? err.message : "Failed to save sections");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/ws/${wsId}/runs/${runId}`);
  };

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
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
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
        <h1 style={{ margin: "0 0 0.5rem 0" }}>Define Response Sections</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Configure the structure of AI evaluation responses. These sections define what
          information the AI should include in its analysis.
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

      {/* Info Box */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#e7f3ff",
          border: "1px solid #b3d7ff",
          borderRadius: "8px",
          marginBottom: "2rem",
        }}
      >
        <strong>ℹ️ How it works:</strong>
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.5rem" }}>
          <li>Add sections to define the structure of AI responses</li>
          <li>Each section becomes a field in the AI's output JSON</li>
          <li>Mark critical sections as "Required"</li>
          <li>Drag to reorder sections by importance</li>
        </ul>
      </div>

      {/* Response Structure Builder */}
      <ResponseStructureBuilder
        initialSections={sections}
        onChange={setSections}
        disabled={saving}
      />

      {/* Action Buttons */}
      <div
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid #ddd",
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={handleCancel}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || sections.length === 0}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: saving || sections.length === 0 ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: saving || sections.length === 0 ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {saving ? "Saving..." : "Save Sections"}
        </button>
      </div>
    </div>
  );
}