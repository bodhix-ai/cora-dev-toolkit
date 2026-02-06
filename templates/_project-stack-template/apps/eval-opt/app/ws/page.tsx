"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@/lib/api-client";

/**
 * Workspace List Page
 * 
 * Lists all workspaces the user has access to for optimization.
 */

interface Workspace {
  id: string;
  name: string;
  description: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  total_samples?: number;
  total_evaluations?: number;
  latest_accuracy?: number;
  role?: string;
  
  // Populated fields
  org_name?: string;
}

export default function WorkspaceListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      loadWorkspaces();
    }
  }, [session]);

  const loadWorkspaces = async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get("/eval-opt/workspaces");
      setWorkspaces(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
      console.error("Error loading workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceClick = (wsId: string) => {
    router.push(`/ws/${wsId}`);
  };

  const handleCreateClick = () => {
    router.push("/ws/new");
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Evaluation Optimization</h1>
        <p>Please sign in to access the optimizer.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Workspaces</h1>
          <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
            Select a workspace to optimize evaluation prompts
          </p>
        </div>
        <button
          onClick={handleCreateClick}
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
          + New Workspace
        </button>
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
          <p>Loading workspaces...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && workspaces.length === 0 && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
          <h2 style={{ marginTop: 0 }}>No Workspaces Yet</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Create a workspace to start optimizing evaluation prompts for your document domains.
          </p>
          <button
            onClick={handleCreateClick}
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
            Create Your First Workspace
          </button>
        </div>
      )}

      {/* Workspace Grid */}
      {!loading && workspaces.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onClick={() => handleWorkspaceClick(ws.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Workspace Card Component
interface WorkspaceCardProps {
  workspace: Workspace;
  onClick: () => void;
}

function WorkspaceCard({ workspace, onClick }: WorkspaceCardProps) {
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
          <h3 style={{ margin: 0, marginBottom: "0.25rem" }}>{workspace.name}</h3>
          {workspace.org_name && (
            <span style={{ fontSize: "0.875rem", color: "#666" }}>{workspace.org_name}</span>
          )}
        </div>
        {workspace.role && (
          <span
            style={{
              padding: "0.25rem 0.5rem",
              backgroundColor: getRoleColor(workspace.role),
              color: "white",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            {workspace.role.toUpperCase()}
          </span>
        )}
      </div>

      {/* Description */}
      {workspace.description && (
        <p
          style={{
            color: "#666",
            margin: "0 0 1rem 0",
            fontSize: "0.875rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {workspace.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
        <div>
          <div style={{ fontWeight: "bold", color: "#007bff" }}>{workspace.total_samples || 0}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Samples</div>
        </div>
        <div>
          <div style={{ fontWeight: "bold", color: "#28a745" }}>{workspace.total_evaluations || 0}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Evaluations</div>
        </div>
        <div>
          <div style={{ fontWeight: "bold", color: "#ffc107" }}>
            {workspace.latest_accuracy ? `${workspace.latest_accuracy}%` : "-"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Accuracy</div>
        </div>
      </div>
    </div>
  );
}

function getRoleColor(role?: string): string {
  switch (role?.toLowerCase()) {
    case "owner":
      return "#dc3545";
    case "admin":
      return "#007bff";
    default:
      return "#6c757d";
  }
}