"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createApiClient } from "@/lib/api-client";
import DocumentGroupCard from "@/components/DocumentGroupCard";

/**
 * Workspace Detail Page
 * 
 * Displays workspace details with tabs for different sections:
 * - Overview: Workspace info and stats
 * - Context: Context documents for RAG (uses module-kb components)
 * - Samples: Sample documents
 * - Evaluations: Manual evaluations (truth keys)
 * - Runs: Optimization runs
 * - Members: Workspace members management
 */

interface WorkspaceDetails {
  id: string;
  name: string;
  description: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  total_samples?: number;
  total_evaluations?: number;
  total_context_docs?: number;
  latest_accuracy?: number;
  role?: string;
  
  // Populated fields
  org_name?: string;
  doc_type_name?: string;
  criteria_set_name?: string;
  criteria_count?: number;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  added_at: string;
  
  // User info
  user_email?: string;
  user_name?: string;
}

type TabType = "overview" | "context" | "samples" | "evaluations" | "runs" | "members";

export default function WorkspaceDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const wsId = params?.wsId as string;

  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && wsId) {
      loadWorkspace();
      loadMembers();
    }
  }, [session, wsId]);

  const loadWorkspace = async () => {
    if (!session?.accessToken || !wsId) return;

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(`/eval-opt/workspaces/${wsId}`);
      setWorkspace(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to load workspace");
      console.error("Error loading workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!session?.accessToken || !wsId) return;

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(`/eval-opt/workspaces/${wsId}/members`);
      setMembers(response.data || []);
    } catch (err: any) {
      console.error("Error loading members:", err);
    }
  };

  const handleBackToWorkspaces = () => {
    router.push("/ws");
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Workspace Details</h1>
        <p>Please sign in to view workspace details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <strong>Error:</strong> {error || "Workspace not found"}
        </div>
        <button
          onClick={handleBackToWorkspaces}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back to Workspaces
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={handleBackToWorkspaces}
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
              <h1 style={{ margin: 0 }}>{workspace.name}</h1>
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: getRoleColor(workspace.role),
                  color: "white",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                {workspace.role?.toUpperCase() || "USER"}
              </span>
            </div>
            {workspace.description && (
              <p style={{ color: "#666", margin: "0.5rem 0" }}>{workspace.description}</p>
            )}
            {workspace.org_name && (
              <div style={{ marginTop: "0.5rem", color: "#666" }}>
                <strong>Organization:</strong> {workspace.org_name}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              padding: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#17a2b8" }}>
                {workspace.total_context_docs || 0}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>Context Docs</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#007bff" }}>
                {workspace.total_samples || 0}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>Samples</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#28a745" }}>
                {workspace.total_evaluations || 0}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>Evaluations</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ffc107" }}>
                {workspace.latest_accuracy ? `${workspace.latest_accuracy}%` : "-"}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "2px solid #ddd", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <TabButton
            label="Overview"
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />
          <TabButton
            label="Context"
            active={activeTab === "context"}
            onClick={() => setActiveTab("context")}
            badge={workspace.total_context_docs}
          />
          <TabButton
            label="Samples"
            active={activeTab === "samples"}
            onClick={() => setActiveTab("samples")}
            badge={workspace.total_samples}
          />
          <TabButton
            label="Evaluations"
            active={activeTab === "evaluations"}
            onClick={() => setActiveTab("evaluations")}
            badge={workspace.total_evaluations}
          />
          <TabButton
            label="Runs"
            active={activeTab === "runs"}
            onClick={() => setActiveTab("runs")}
          />
          <TabButton
            label="Members"
            active={activeTab === "members"}
            onClick={() => setActiveTab("members")}
            badge={members.length}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && <OverviewTab workspace={workspace} />}
        {activeTab === "context" && <ContextTab wsId={wsId} />}
        {activeTab === "samples" && <SamplesTab wsId={wsId} />}
        {activeTab === "evaluations" && <EvaluationsTab wsId={wsId} />}
        {activeTab === "runs" && <RunsTab wsId={wsId} />}
        {activeTab === "members" && (
          <MembersTab
            wsId={wsId}
            members={members}
            userRole={workspace.role}
            onMembersChange={loadMembers}
          />
        )}
      </div>
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function TabButton({ label, active, onClick, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.75rem 1.5rem",
        backgroundColor: active ? "white" : "transparent",
        color: active ? "#007bff" : "#666",
        border: "none",
        borderBottom: active ? "2px solid #007bff" : "2px solid transparent",
        cursor: "pointer",
        fontSize: "1rem",
        fontWeight: active ? "bold" : "normal",
        position: "relative",
        marginBottom: "-2px",
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            marginLeft: "0.5rem",
            padding: "0.125rem 0.5rem",
            backgroundColor: active ? "#007bff" : "#6c757d",
            color: "white",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Overview Tab
function OverviewTab({ workspace }: { workspace: WorkspaceDetails }) {
  return (
    <div>
      <h2>Workspace Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "1.5rem" }}>
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Configuration</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <strong>Document Type:</strong> {workspace.doc_type_name || "Not configured"}
            </div>
            <div>
              <strong>Criteria Set:</strong> {workspace.criteria_set_name || "Not configured"}
            </div>
            <div>
              <strong>Criteria Count:</strong> {workspace.criteria_count || "Unknown"}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <strong>Context Documents:</strong> {workspace.total_context_docs || 0}
            </div>
            <div>
              <strong>Sample Documents:</strong> {workspace.total_samples || 0}
            </div>
            <div>
              <strong>Truth Key Evaluations:</strong> {workspace.total_evaluations || 0}
            </div>
            <div>
              <strong>Latest Accuracy:</strong>{" "}
              {workspace.latest_accuracy ? `${workspace.latest_accuracy}%` : "No runs yet"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          backgroundColor: "#d1ecf1",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Next Steps</h3>
        <ol style={{ marginBottom: 0 }}>
          <li><strong>Upload Context Documents</strong> (Context tab) - Domain standards, guides, requirements for RAG</li>
          <li><strong>Upload Sample Documents</strong> (Samples tab) - Documents to evaluate</li>
          <li><strong>Create Truth Keys</strong> (Evaluations tab) - Manually evaluate samples</li>
          <li><strong>Run Optimization</strong> (Runs tab) - System generates and tests prompts automatically</li>
          <li><strong>Review Results</strong> - Compare accuracy, iterate as needed</li>
        </ol>
      </div>
    </div>
  );
}

// Context Tab - Uses existing module-kb components
function ContextTab({ wsId }: { wsId: string }) {
  const router = useRouter();
  
  const handleOpenContextPage = () => {
    router.push(`/ws/${wsId}/context`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Context Documents</h2>
          <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
            Upload domain standards, guides, and requirements for RAG-based prompt generation.
          </p>
        </div>
        <button
          onClick={handleOpenContextPage}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Manage Context Documents
        </button>
      </div>

      <div
        style={{
          padding: "2rem",
          backgroundColor: "#e7f3ff",
          borderRadius: "8px",
          marginTop: "1rem",
        }}
      >
        <h4 style={{ marginTop: 0, color: "#0056b3" }}>Why Context Documents?</h4>
        <p style={{ color: "#333", marginBottom: "1rem" }}>
          Context documents provide domain knowledge that the system uses to generate 
          <strong> domain-aware prompts</strong>. For example:
        </p>
        <ul style={{ color: "#333", marginBottom: "0" }}>
          <li><strong>IT Security Audits:</strong> Upload CJIS requirements, security control standards</li>
          <li><strong>Federal Appraisals:</strong> Upload Uniform Standards of Professional Appraisal Practice (USPAP)</li>
          <li><strong>FOIA Requests:</strong> Upload exemption guidelines, redaction rules</li>
        </ul>
        <p style={{ color: "#666", marginTop: "1rem", marginBottom: 0, fontSize: "0.875rem" }}>
          The system extracts key concepts, standards, and terminology from these documents 
          to generate contextually appropriate evaluation prompts.
        </p>
      </div>
    </div>
  );
}

// Samples Tab
function SamplesTab({ wsId }: { wsId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && wsId) {
      loadSamples();
    }
  }, [session, wsId]);

  const loadSamples = async () => {
    if (!session?.accessToken || !wsId) return;

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.get(`/eval-opt/workspaces/${wsId}/samples`);
      setSamples(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load samples");
      console.error("Error loading samples:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    router.push(`/ws/${wsId}/samples/upload`);
  };

  const handleViewSample = (groupId: string) => {
    router.push(`/ws/${wsId}/samples/${groupId}`);
  };

  const handleEvaluateSample = (groupId: string) => {
    router.push(`/ws/${wsId}/evaluate/${groupId}`);
  };

  const handleDeleteSample = async (groupId: string) => {
    if (!session?.accessToken) return;

    try {
      const client = createApiClient(session.accessToken);
      await client.delete(`/eval-opt/workspaces/${wsId}/samples/${groupId}`);
      loadSamples();
    } catch (err: any) {
      alert(`Failed to delete sample: ${err.message}`);
      console.error("Error deleting sample:", err);
    }
  };

  if (loading) {
    return (
      <div>
        <h2>Sample Documents</h2>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading samples...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Sample Documents</h2>
        <button
          onClick={handleUploadClick}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + Upload Sample
        </button>
      </div>

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

      {samples.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
          <h3 style={{ marginTop: 0 }}>No Sample Documents Yet</h3>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Upload sample documents to start creating truth keys and optimizing prompts.
          </p>
          <button
            onClick={handleUploadClick}
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
            Upload Your First Sample
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {samples.map((sample) => (
            <DocumentGroupCard
              key={sample.id}
              group={sample}
              onView={handleViewSample}
              onEvaluate={handleEvaluateSample}
              onDelete={handleDeleteSample}
              canDelete={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Evaluations Tab
function EvaluationsTab({ wsId }: { wsId: string }) {
  return (
    <div>
      <h2>Truth Key Evaluations</h2>
      <div
        style={{
          padding: "2rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginTop: "1rem",
        }}
      >
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          View and manage truth key evaluations. Select a sample document from the Samples tab 
          and click "Evaluate" to create truth keys.
        </p>
        <p style={{ color: "#999", fontSize: "0.875rem", marginBottom: 0 }}>
          Workspace ID: {wsId}
        </p>
      </div>
    </div>
  );
}

// Runs Tab
function RunsTab({ wsId }: { wsId: string }) {
  const router = useRouter();
  
  const handleNewRun = () => {
    router.push(`/ws/${wsId}/runs/new`);
  };

  const handleViewRuns = () => {
    router.push(`/ws/${wsId}/runs`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Optimization Runs</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleViewRuns}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f8f9fa",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            View All Runs
          </button>
          <button
            onClick={handleNewRun}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + New Optimization Run
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "2rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <p style={{ color: "#666", marginBottom: 0 }}>
          Start an optimization run to have the system automatically generate and test 
          domain-aware prompts using RAG and LLM meta-prompting.
        </p>
      </div>
    </div>
  );
}

// Members Tab
interface MembersTabProps {
  wsId: string;
  members: WorkspaceMember[];
  userRole?: string;
  onMembersChange: () => void;
}

function MembersTab({ wsId, members, userRole, onMembersChange }: MembersTabProps) {
  const { data: session } = useSession();
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("user");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManageMembers = userRole === "owner" || userRole === "admin";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.accessToken) return;

    if (!newMemberEmail.trim()) {
      setError("Email is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      await client.post(`/eval-opt/workspaces/${wsId}/members`, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });

      setNewMemberEmail("");
      setNewMemberRole("user");
      setAddingMember(false);
      onMembersChange();
    } catch (err: any) {
      setError(err.message || "Failed to add member");
      console.error("Error adding member:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!session?.accessToken) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const client = createApiClient(session.accessToken);
      await client.delete(`/eval-opt/workspaces/${wsId}/members/${memberId}`);
      onMembersChange();
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message}`);
      console.error("Error removing member:", err);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Workspace Members</h2>
        {canManageMembers && !addingMember && (
          <button
            onClick={() => setAddingMember(true)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add Member
          </button>
        )}
      </div>

      {/* Add Member Form */}
      {addingMember && (
        <form
          onSubmit={handleAddMember}
          style={{
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add New Member</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "1rem", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
                Email Address
              </label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
                Role
              </label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  boxSizing: "border-box",
                }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                {userRole === "owner" && <option value="owner">Owner</option>}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: submitting ? "#ccc" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingMember(false);
                  setError(null);
                }}
                disabled={submitting}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
          {error && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                backgroundColor: "#f8d7da",
                color: "#721c24",
                borderRadius: "4px",
              }}
            >
              {error}
            </div>
          )}
        </form>
      )}

      {/* Members List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <div style={{ flex: 1 }}>
              <strong>{member.user_email || member.user_name || member.user_id}</strong>
            </div>
            <div style={{ width: "100px", textAlign: "center" }}>
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: getRoleColor(member.role),
                  color: "white",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {member.role.toUpperCase()}
              </span>
            </div>
            <div style={{ width: "150px", textAlign: "right", fontSize: "0.875rem", color: "#666" }}>
              Added {formatDate(member.added_at)}
            </div>
            {canManageMembers && member.role !== "owner" && (
              <div style={{ width: "80px", textAlign: "right" }}>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
              color: "#666",
            }}
          >
            No members yet
          </div>
        )}
      </div>

      {!canManageMembers && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "#fff3cd",
            borderRadius: "4px",
            color: "#856404",
          }}
        >
          <strong>Note:</strong> Only workspace owners and admins can manage members.
        </div>
      )}
    </div>
  );
}

// Helper Functions
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