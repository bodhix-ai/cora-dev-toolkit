import React from "react";

/**
 * Document Group Card Component
 * 
 * Displays a sample document group with metadata and status.
 * A document group consists of:
 * - Primary document (the main document to evaluate)
 * - Supporting artifacts (proof documents, related files)
 */

export interface DocumentGroup {
  id: string;
  name: string;
  primary_doc_id: string;
  status: "pending_evaluation" | "evaluated" | "validated";
  created_at: string;
  updated_at: string;
  
  // Populated fields
  primary_doc_name?: string;
  primary_doc_size?: number;
  artifact_count?: number;
  evaluation_progress?: {
    completed: number;
    total: number;
  };
}

interface DocumentGroupCardProps {
  group: DocumentGroup;
  onView?: (groupId: string) => void;
  onEvaluate?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
  canDelete?: boolean;
}

export default function DocumentGroupCard({
  group,
  onView,
  onEvaluate,
  onDelete,
  canDelete = true,
}: DocumentGroupCardProps) {
  const statusColor = getStatusColor(group.status);
  const statusLabel = getStatusLabel(group.status);

  return (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>{group.name}</h3>
          <div style={{ fontSize: "0.875rem", color: "#666" }}>
            {group.primary_doc_name || `Document ${group.primary_doc_id}`}
            {group.primary_doc_size && ` (${formatFileSize(group.primary_doc_size)})`}
          </div>
        </div>
        <span
          style={{
            padding: "0.25rem 0.75rem",
            backgroundColor: statusColor,
            color: "white",
            borderRadius: "4px",
            fontSize: "0.875rem",
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Metadata */}
      <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem", color: "#666" }}>
        <div>
          <strong>Artifacts:</strong> {group.artifact_count || 0}
        </div>
        {group.evaluation_progress && (
          <div>
            <strong>Evaluated:</strong> {group.evaluation_progress.completed} / {group.evaluation_progress.total}
          </div>
        )}
        <div>
          <strong>Added:</strong> {formatDate(group.created_at)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        {onView && (
          <button
            onClick={() => onView(group.id)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            View Details
          </button>
        )}
        {onEvaluate && group.status === "pending_evaluation" && (
          <button
            onClick={() => onEvaluate(group.id)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Start Evaluation
          </button>
        )}
        {canDelete && onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete "${group.name}"? This action cannot be undone.`)) {
                onDelete(group.id);
              }
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "#dc3545",
              border: "1px solid #dc3545",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
              marginLeft: "auto",
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Evaluation Progress Bar */}
      {group.evaluation_progress && group.evaluation_progress.total > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#e9ecef",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(group.evaluation_progress.completed / group.evaluation_progress.total) * 100}%`,
                height: "100%",
                backgroundColor: group.status === "evaluated" ? "#28a745" : "#ffc107",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Functions
function getStatusColor(status: string): string {
  switch (status) {
    case "pending_evaluation":
      return "#6c757d"; // Gray
    case "evaluated":
      return "#28a745"; // Green
    case "validated":
      return "#007bff"; // Blue
    default:
      return "#6c757d";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending_evaluation":
      return "PENDING";
    case "evaluated":
      return "EVALUATED";
    case "validated":
      return "VALIDATED";
    default:
      return status.toUpperCase();
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  } catch {
    return "unknown";
  }
}