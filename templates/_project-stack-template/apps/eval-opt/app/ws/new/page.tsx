"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@/lib/api-client";

/**
 * Create Workspace Page
 * 
 * Form to create a new optimization workspace.
 * Workspace is tied to a doc type + criteria set combination.
 */

interface DocType {
  id: string;
  name: string;
  description?: string;
}

interface CriteriaSet {
  id: string;
  name: string;
  description?: string;
  criteria_count?: number;
}

interface Organization {
  id: string;
  name: string;
}

export default function CreateWorkspacePage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orgId, setOrgId] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [criteriaSetId, setCriteriaSetId] = useState("");

  // Data state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [loadingCriteriaSets, setLoadingCriteriaSets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load organizations on mount
  useEffect(() => {
    if (session?.accessToken) {
      loadOrganizations();
    }
  }, [session]);

  // Load doc types when org changes
  useEffect(() => {
    if (session?.accessToken && orgId) {
      loadDocTypes(orgId);
      setCriteriaSets([]);
      setCriteriaSetId("");
    }
  }, [session, orgId]);

  // Load criteria sets when doc type changes
  useEffect(() => {
    if (session?.accessToken && orgId && docTypeId) {
      loadCriteriaSets(orgId, docTypeId);
    }
  }, [session, orgId, docTypeId]);

  const loadOrganizations = async () => {
    if (!session?.accessToken) return;

    setLoadingOrgs(true);
    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get("/access/orgs");
      setOrganizations(response.data || []);
    } catch (err: any) {
      console.error("Error loading organizations:", err);
      setError("Failed to load organizations");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadDocTypes = async (selectedOrgId: string) => {
    if (!session?.accessToken) return;

    setLoadingDocTypes(true);
    setDocTypes([]);
    setDocTypeId("");
    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(`/eval/orgs/${selectedOrgId}/doc-types`);
      setDocTypes(response.data || []);
    } catch (err: any) {
      console.error("Error loading doc types:", err);
    } finally {
      setLoadingDocTypes(false);
    }
  };

  const loadCriteriaSets = async (selectedOrgId: string, selectedDocTypeId: string) => {
    if (!session?.accessToken) return;

    setLoadingCriteriaSets(true);
    setCriteriaSets([]);
    setCriteriaSetId("");
    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(
        `/eval/orgs/${selectedOrgId}/doc-types/${selectedDocTypeId}/criteria-sets`
      );
      setCriteriaSets(response.data || []);
    } catch (err: any) {
      console.error("Error loading criteria sets:", err);
    } finally {
      setLoadingCriteriaSets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.accessToken) return;

    // Validation
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }
    if (!orgId) {
      setError("Organization is required");
      return;
    }
    if (!docTypeId) {
      setError("Document type is required");
      return;
    }
    if (!criteriaSetId) {
      setError("Criteria set is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.post("/eval-opt/workspaces", {
        name: name.trim(),
        description: description.trim(),
        org_id: orgId,
        doc_type_id: docTypeId,
        criteria_set_id: criteriaSetId,
      });

      // Navigate to the new workspace
      router.push(`/ws/${response.data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
      console.error("Error creating workspace:", err);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/ws");
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Create Workspace</h1>
        <p>Please sign in to create a workspace.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={handleCancel}
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
          ← Back to Workspaces
        </button>
        <h1 style={{ margin: 0 }}>Create New Workspace</h1>
        <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
          Set up a workspace to optimize evaluation prompts for a specific document domain
        </p>
      </div>

      {/* Error Display */}
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

      {/* Form */}
      <form onSubmit={handleSubmit}>
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
              htmlFor="name"
              style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
            >
              Workspace Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., IT Security Policy Optimization"
              required
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
              htmlFor="description"
              style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this optimization workspace..."
              rows={3}
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

        {/* Configuration */}
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Configuration</h2>

          {/* Organization Selector */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="org"
              style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
            >
              Organization *
            </label>
            <select
              id="org"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              required
              disabled={loadingOrgs}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
                backgroundColor: loadingOrgs ? "#e9ecef" : "white",
              }}
            >
              <option value="">
                {loadingOrgs ? "Loading organizations..." : "Select an organization"}
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type Selector */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="docType"
              style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
            >
              Document Type *
            </label>
            <select
              id="docType"
              value={docTypeId}
              onChange={(e) => setDocTypeId(e.target.value)}
              required
              disabled={!orgId || loadingDocTypes}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
                backgroundColor: !orgId || loadingDocTypes ? "#e9ecef" : "white",
              }}
            >
              <option value="">
                {!orgId
                  ? "Select an organization first"
                  : loadingDocTypes
                  ? "Loading document types..."
                  : "Select a document type"}
              </option>
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
            {docTypes.length === 0 && orgId && !loadingDocTypes && (
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                No document types configured for this organization.
              </p>
            )}
          </div>

          {/* Criteria Set Selector */}
          <div>
            <label
              htmlFor="criteriaSet"
              style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
            >
              Criteria Set *
            </label>
            <select
              id="criteriaSet"
              value={criteriaSetId}
              onChange={(e) => setCriteriaSetId(e.target.value)}
              required
              disabled={!docTypeId || loadingCriteriaSets}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
                backgroundColor: !docTypeId || loadingCriteriaSets ? "#e9ecef" : "white",
              }}
            >
              <option value="">
                {!docTypeId
                  ? "Select a document type first"
                  : loadingCriteriaSets
                  ? "Loading criteria sets..."
                  : "Select a criteria set"}
              </option>
              {criteriaSets.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.name} {cs.criteria_count ? `(${cs.criteria_count} criteria)` : ""}
                </option>
              ))}
            </select>
            {criteriaSets.length === 0 && docTypeId && !loadingCriteriaSets && (
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                No criteria sets configured for this document type.
              </p>
            )}
          </div>
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
          <strong style={{ color: "#0c5460" }}>ℹ️ Important:</strong>
          <p style={{ margin: "0.5rem 0 0 0", color: "#0c5460", fontSize: "0.875rem" }}>
            The document type and criteria set cannot be changed after workspace creation.
            This ensures truth keys remain valid for the configured evaluation criteria.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name || !orgId || !docTypeId || !criteriaSetId}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor:
                loading || !name || !orgId || !docTypeId || !criteriaSetId ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                loading || !name || !orgId || !docTypeId || !criteriaSetId
                  ? "not-allowed"
                  : "pointer",
              fontSize: "1rem",
            }}
          >
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </div>
      </form>
    </div>
  );
}