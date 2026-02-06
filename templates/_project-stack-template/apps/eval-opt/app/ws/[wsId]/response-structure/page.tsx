"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createApiClient } from "@/lib/api-client";
import ResponseStructureBuilder from "@/components/ResponseStructureBuilder";

/**
 * Response Structure Configuration Page
 * 
 * Allows users to define the JSON response structure that AI evaluations
 * should produce. This structure is used when the system generates prompts
 * to ensure consistent, structured output.
 */

interface ResponseSection {
  id: string;
  name: string;
  description: string;
  type: "text" | "list" | "object" | "number" | "boolean";
  required: boolean;
}

interface ResponseStructure {
  id: string;
  ws_id: string;
  name: string;
  description?: string;
  sections: ResponseSection[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ResponseStructurePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const wsId = params?.wsId as string;

  // Data state
  const [structure, setStructure] = useState<ResponseStructure | null>(null);
  const [sections, setSections] = useState<ResponseSection[]>([]);

  // Form state
  const [name, setName] = useState("Default Response Structure");
  const [description, setDescription] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && wsId) {
      loadResponseStructure();
    }
  }, [session, wsId]);

  const loadResponseStructure = async () => {
    if (!session?.accessToken || !wsId) return;

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(`/eval-opt/workspaces/${wsId}/response-structure`);

      if (response.data) {
        setStructure(response.data);
        setName(response.data.name);
        setDescription(response.data.description || "");
        setSections(response.data.sections || []);
      }
    } catch (err: any) {
      // If 404, no structure exists yet - that's OK
      if (err.response?.status !== 404) {
        setError(err.message || "Failed to load response structure");
        console.error("Error loading response structure:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSectionsChange = (newSections: ResponseSection[]) => {
    setSections(newSections);
  };

  const handleSave = async () => {
    if (!session?.accessToken || !wsId) return;

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (sections.length === 0) {
      setError("At least one response section is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const client = createApiClient(session.accessToken);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        sections: sections,
        is_active: true,
      };

      if (structure) {
        // Update existing
        await client.put(`/eval-opt/workspaces/${wsId}/response-structure/${structure.id}`, payload);
      } else {
        // Create new
        await client.post(`/eval-opt/workspaces/${wsId}/response-structure`, payload);
      }

      setSuccessMessage("Response structure saved successfully!");

      // Reload to get updated data
      await loadResponseStructure();
    } catch (err: any) {
      setError(err.message || "Failed to save response structure");
      console.error("Error saving response structure:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleBackToWorkspace = () => {
    router.push(`/ws/${wsId}`);
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Response Structure</h1>
        <p>Please sign in to configure response structure.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading response structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={handleBackToWorkspace}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#f8f9fa",
            color: "#333",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          ← Back to Workspace
        </button>
        <h1 style={{ margin: 0 }}>Response Structure</h1>
        <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
          Define what information the AI evaluation should return in its response
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#d4edda",
            color: "#155724",
            borderRadius: "4px",
            marginBottom: "1.5rem",
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            marginBottom: "1.5rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Basic Info */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Basic Information</h2>

        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="structureName"
            style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
          >
            Structure Name *
          </label>
          <input
            id="structureName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., CJIS Compliance Evaluation"
            disabled={saving}
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

        <div>
          <label
            htmlFor="structureDescription"
            style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
          >
            Description
          </label>
          <textarea
            id="structureDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose of this response structure..."
            disabled={saving}
            rows={2}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "1rem",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Response Structure Builder */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <ResponseStructureBuilder
          initialSections={sections}
          onChange={handleSectionsChange}
          disabled={saving}
        />
      </div>

      {/* Info Box */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#d1ecf1",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <strong style={{ color: "#0c5460" }}>💡 How it works:</strong>
        <p style={{ margin: "0.5rem 0 0 0", color: "#0c5460", fontSize: "0.875rem" }}>
          When you run an optimization, the system uses this structure to generate prompts
          that produce consistent, structured JSON responses. This ensures the AI evaluation
          output matches your expected format and includes all required information.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleBackToWorkspace}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim() || sections.length === 0}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor:
              saving || !name.trim() || sections.length === 0 ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              saving || !name.trim() || sections.length === 0 ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {saving ? "Saving..." : structure ? "Update Structure" : "Save Structure"}
        </button>
      </div>
    </div>
  );
}