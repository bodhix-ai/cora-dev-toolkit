"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createApiClient } from "@/lib/api-client";

/**
 * Optimization Runs List Page
 * 
 * Lists all optimization runs for a workspace.
 */

interface OptimizationRun {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  thoroughness: "fast" | "balanced" | "thorough";
  
  // Results (when completed)
  total_samples?: number;
  total_criteria?: number;
  overall_accuracy?: number;
  
  // Timestamps
  created_at: string;
  started_at?: string;
  completed_at?: string;
  
  // Creator info
  created_by_name?: string;
}

export default function RunsListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const wsId = params?.wsId as string;

  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && wsId) {
      loadRuns();
    }
  }, [session, wsId]);

  const loadRuns = async () => {
    if (!session?.accessToken || !wsId) return;

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(`/eval-opt/workspaces/${wsId}/runs`);
      setRuns(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load optimization runs");
      console.error("Error loading runs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToWorkspace = () => {
    router.push(`/ws/${wsId}`);
  };

  const handleNewRun = () => {
    router.push(`/ws/${wsId}/runs/new`);
  };

  const handleViewRun = (runId: string) => {
    router.push(`/ws/${wsId}/runs/${runId}`);
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Optimization Runs</h1>
        <p>Please sign in to view runs.</p>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Optimization Runs</h1>
            <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
              View and manage prompt optimization runs
            </p>
          </div>
          <button
            onClick={handleNewRun}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            + New Optimization Run
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
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
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading optimization runs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && runs.length === 0 && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
          <h2 style={{ marginTop: 0 }}>No Optimization Runs Yet</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Start an optimization run to have the system automatically generate 
            and test domain-aware prompts using your truth keys.
          </p>
          <button
            onClick={handleNewRun}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Start Your First Run
          </button>
        </div>
      )}

      {/* Runs List */}
      {!loading && runs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {runs.map((run) => (
            <RunCard key={run.id} run={run} onClick={() => handleViewRun(run.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Run Card Component
interface RunCardProps {
  run: OptimizationRun;
  onClick: () => void;
}

function RunCard({ run, onClick }: RunCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "1.5rem",
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = "#007bff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#ddd";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: "0.25rem" }}>{run.name}</h3>
          <span style={{ fontSize: "0.875rem", color: "#666" }}>
            {run.created_by_name || "Unknown"} • {formatDate(run.created_at)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <StatusBadge status={run.status} />
          <ThoroughnessBadge thoroughness={run.thoroughness} />
        </div>
      </div>

      {/* Stats (when completed) */}
      {run.status === "completed" && (
        <div
          style={{
            display: "flex",
            gap: "2rem",
            paddingTop: "1rem",
            borderTop: "1px solid #eee",
          }}
        >
          <div>
            <div style={{ fontWeight: "bold", color: "#007bff", fontSize: "1.5rem" }}>
              {run.overall_accuracy !== undefined ? `${run.overall_accuracy}%` : "-"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666" }}>Accuracy</div>
          </div>
          <div>
            <div style={{ fontWeight: "bold", color: "#28a745", fontSize: "1.5rem" }}>
              {run.total_samples || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666" }}>Samples</div>
          </div>
          <div>
            <div style={{ fontWeight: "bold", color: "#17a2b8", fontSize: "1.5rem" }}>
              {run.total_criteria || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666" }}>Criteria</div>
          </div>
          {run.completed_at && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>
                Completed {formatDate(run.completed_at)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#999" }}>
                Duration: {formatDuration(run.started_at, run.completed_at)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Running indicator */}
      {run.status === "running" && (
        <div
          style={{
            paddingTop: "1rem",
            borderTop: "1px solid #eee",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#e9ecef",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "60%",
                height: "100%",
                backgroundColor: "#007bff",
                borderRadius: "4px",
                animation: "progress 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#666" }}>
            Generating and testing prompts...
          </p>
        </div>
      )}

      {/* Failed indicator */}
      {run.status === "failed" && (
        <div
          style={{
            paddingTop: "1rem",
            borderTop: "1px solid #eee",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#dc3545" }}>
            ⚠️ This run failed. Click to view details and retry.
          </p>
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: OptimizationRun["status"] }) {
  const config = {
    pending: { bg: "#6c757d", label: "Pending" },
    running: { bg: "#007bff", label: "Running" },
    completed: { bg: "#28a745", label: "Completed" },
    failed: { bg: "#dc3545", label: "Failed" },
  };

  const { bg, label } = config[status] || config.pending;

  return (
    <span
      style={{
        padding: "0.25rem 0.5rem",
        backgroundColor: bg,
        color: "white",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
      }}
    >
      {label}
    </span>
  );
}

// Thoroughness Badge Component
function ThoroughnessBadge({ thoroughness }: { thoroughness: OptimizationRun["thoroughness"] }) {
  const config = {
    fast: { bg: "#ffc107", label: "Fast (5)", color: "#000" },
    balanced: { bg: "#17a2b8", label: "Balanced (7)", color: "#fff" },
    thorough: { bg: "#6610f2", label: "Thorough (12)", color: "#fff" },
  };

  const { bg, label, color } = config[thoroughness] || config.balanced;

  return (
    <span
      style={{
        padding: "0.25rem 0.5rem",
        backgroundColor: bg,
        color: color,
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
      }}
    >
      {label}
    </span>
  );
}

// Helper Functions
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

function formatDuration(startStr?: string, endStr?: string): string {
  if (!startStr || !endStr) return "-";

  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ${diffInSeconds % 60}s`;
    return `${Math.floor(diffInSeconds / 3600)}h ${Math.floor((diffInSeconds % 3600) / 60)}m`;
  } catch {
    return "-";
  }
}