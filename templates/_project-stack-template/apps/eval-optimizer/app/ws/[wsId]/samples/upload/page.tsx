"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createApiClient } from "@/lib/api-client";
import DocumentUploader from "@/components/DocumentUploader";

/**
 * Sample Document Upload Page
 * 
 * Allows users to upload sample documents for evaluation.
 * Documents are uploaded to the workspace's KB via module-kb APIs
 * and tracked as document groups for truth key creation.
 */

interface UploadedDocument {
  id: string;
  name: string;
  status: "pending" | "uploaded" | "error";
  errorMessage?: string;
}

export default function SampleUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const wsId = params?.wsId as string;

  // Form state
  const [groupName, setGroupName] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    if (!session?.accessToken || !wsId) return;

    setUploading(true);
    setError(null);

    const results: UploadedDocument[] = [];

    try {
      const client = createApiClient(session.accessToken);

      for (const file of files) {
        try {
          // Create form data for upload
          const formData = new FormData();
          formData.append("file", file);
          formData.append("name", file.name);

          // Upload to workspace KB via module-kb
          const response = await client.post(
            `/eval-opt/workspaces/${wsId}/samples/upload`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          results.push({
            id: response.data.id,
            name: file.name,
            status: "uploaded",
          });
        } catch (err: any) {
          results.push({
            id: `error-${Date.now()}`,
            name: file.name,
            status: "error",
            errorMessage: err.message || "Upload failed",
          });
        }
      }

      setUploadedDocs((prev) => [...prev, ...results]);

      // Auto-populate group name if not set
      if (!groupName && results.length > 0) {
        const firstUploaded = results.find((r) => r.status === "uploaded");
        if (firstUploaded) {
          const nameWithoutExt = firstUploaded.name.replace(/\.[^/.]+$/, "");
          setGroupName(nameWithoutExt);
        }
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
      console.error("Error uploading files:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateDocumentGroup = async () => {
    if (!session?.accessToken || !wsId) return;

    const successfulDocs = uploadedDocs.filter((d) => d.status === "uploaded");
    if (successfulDocs.length === 0) {
      setError("Please upload at least one document");
      return;
    }

    if (!groupName.trim()) {
      setError("Please provide a name for the document group");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);

      await client.post(`/eval-opt/workspaces/${wsId}/samples`, {
        name: groupName.trim(),
        primary_doc_id: successfulDocs[0].id,
        supporting_doc_ids: successfulDocs.slice(1).map((d) => d.id),
      });

      setSuccessMessage("Sample document group created successfully!");

      // Navigate back to workspace after brief delay
      setTimeout(() => {
        router.push(`/ws/${wsId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create document group");
      console.error("Error creating document group:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleBackToWorkspace = () => {
    router.push(`/ws/${wsId}`);
  };

  const successfulDocs = uploadedDocs.filter((d) => d.status === "uploaded");
  const canCreate = successfulDocs.length > 0 && groupName.trim().length > 0;

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Upload Sample Document</h1>
        <p>Please sign in to upload documents.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
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
        <h1 style={{ margin: 0 }}>Upload Sample Document</h1>
        <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
          Upload a document to create a sample for truth key creation and optimization
        </p>
      </div>

      {/* Success Message */}
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

      {/* Upload Section */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>1. Upload Documents</h2>
        <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Upload the primary document you want to evaluate. You can also upload supporting
          documents (proof artifacts) that provide additional context.
        </p>

        <DocumentUploader
          onUpload={handleUpload}
          acceptedFileTypes=".pdf,.doc,.docx,.txt"
          maxFileSizeMB={10}
          multiple={true}
          disabled={uploading || creating}
        />

        {/* Uploaded Documents List */}
        {uploadedDocs.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Uploaded Documents</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {uploadedDocs.map((doc, index) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    backgroundColor: doc.status === "error" ? "#fff5f5" : "white",
                    border: `1px solid ${doc.status === "error" ? "#f8d7da" : "#ddd"}`,
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ color: "#666", fontSize: "0.875rem" }}>
                      {index === 0 ? "📄 Primary" : "📎 Supporting"}
                    </span>
                    <span style={{ fontWeight: index === 0 ? "bold" : "normal" }}>
                      {doc.name}
                    </span>
                    {doc.status === "error" && (
                      <span style={{ color: "#dc3545", fontSize: "0.875rem" }}>
                        ({doc.errorMessage})
                      </span>
                    )}
                    {doc.status === "uploaded" && (
                      <span style={{ color: "#28a745", fontSize: "0.875rem" }}>✓</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(doc.id)}
                    disabled={creating}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "transparent",
                      color: "#dc3545",
                      border: "1px solid #dc3545",
                      borderRadius: "4px",
                      cursor: creating ? "not-allowed" : "pointer",
                      fontSize: "0.75rem",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Group Configuration */}
      {successfulDocs.length > 0 && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>2. Name Your Sample</h2>
          <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.875rem" }}>
            Give this sample a descriptive name. This will help you identify it when creating
            truth keys and reviewing optimization results.
          </p>

          <div>
            <label
              htmlFor="groupName"
              style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
            >
              Sample Name *
            </label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., CJIS Security Policy v5.9"
              disabled={creating}
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

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleBackToWorkspace}
          disabled={creating}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: creating ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreateDocumentGroup}
          disabled={!canCreate || creating}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: !canCreate || creating ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !canCreate || creating ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {creating ? "Creating..." : "Create Sample"}
        </button>
      </div>

      {/* Info Box */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#d1ecf1",
          borderRadius: "8px",
        }}
      >
        <strong style={{ color: "#0c5460" }}>💡 Tip:</strong>
        <p style={{ margin: "0.5rem 0 0 0", color: "#0c5460", fontSize: "0.875rem" }}>
          After creating a sample, you can evaluate it to create truth keys. These truth keys
          are used to train and optimize AI evaluation prompts for your document domain.
        </p>
      </div>
    </div>
  );
}