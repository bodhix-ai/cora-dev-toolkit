"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { createApiClient } from "@/lib/api-client";

/**
 * Optimizer Workflow Page - Sprint 1 Prototype
 * 
 * Purpose: Prove end-to-end API integration with CORA modules.
 * 
 * Demonstrates:
 * - createApiClient() factory pattern (ADR-004 compliance)
 * - API calls to module-access, module-ws, module-kb, module-eval
 * - Workflow: Create test org → Create workspace → Upload doc → Run eval
 * 
 * This proves Option A (Same Stack Repo) enables:
 * - Shared authentication (access token from session)
 * - Code reuse (api-client factory from workspace package)
 * - Direct CORA module API integration
 */
export default function OptimizerPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runWorkflow = async () => {
    if (!session?.accessToken) {
      addLog("❌ No access token available");
      return;
    }

    setLoading(true);
    setLogs([]);

    try {
      // Create authenticated API client using shared factory
      const client = createApiClient(session.accessToken);
      
      addLog("✅ API client created with access token");

      // Step 1: Create test organization (module-access)
      addLog("📝 Step 1: Creating test organization...");
      const orgResponse = await client.post("/access/orgs", {
        name: `eval-opt-test-${Date.now()}`,
        description: "Test org for prompt optimization",
      });
      const orgId = orgResponse.id;
      addLog(`✅ Created org: ${orgId}`);

      // Step 2: Create workspace (module-ws)
      addLog("📝 Step 2: Creating workspace...");
      const wsResponse = await client.post("/ws/workspaces", {
        org_id: orgId,
        name: "Optimization Workspace",
        description: "Test workspace for eval optimization",
      });
      const wsId = wsResponse.id;
      addLog(`✅ Created workspace: ${wsId}`);

      // Step 3: Upload sample document (module-kb)
      addLog("📝 Step 3: Uploading sample document...");
      const docResponse = await client.post("/kb/documents", {
        ws_id: wsId,
        name: "Sample Policy Document",
        content: "This is a sample policy document for testing evaluation optimization.",
        doc_type: "policy",
      });
      const docId = docResponse.id;
      addLog(`✅ Uploaded document: ${docId}`);

      // Step 4: Run evaluation (module-eval)
      addLog("📝 Step 4: Running evaluation...");
      const evalResponse = await client.post("/eval/run", {
        ws_id: wsId,
        doc_ids: [docId],
        criteria_set_id: "default", // Would use actual criteria set ID
      });
      const evalId = evalResponse.id;
      addLog(`✅ Started evaluation: ${evalId}`);

      addLog("🎉 Workflow completed successfully!");
      addLog("");
      addLog("This proves Option A enables:");
      addLog("  ✅ Shared authentication (same Okta/Cognito)");
      addLog("  ✅ API client reuse (from workspace package)");
      addLog("  ✅ Full CORA module API integration");

    } catch (error: any) {
      addLog(`❌ Error: ${error.message || error}`);
      if (error.response) {
        addLog(`   Status: ${error.response.status}`);
        addLog(`   Details: ${JSON.stringify(error.response.data)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Optimizer Workflow</h1>
        <p>Please sign in to continue.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Optimizer Workflow - Sprint 1 Prototype</h1>
      
      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
        <h2>End-to-End API Integration Test</h2>
        <p>This workflow demonstrates calling CORA module APIs:</p>
        <ol>
          <li><strong>module-access:</strong> Create test organization</li>
          <li><strong>module-ws:</strong> Create workspace</li>
          <li><strong>module-kb:</strong> Upload sample document</li>
          <li><strong>module-eval:</strong> Run evaluation</li>
        </ol>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={runWorkflow}
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loading ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {loading ? "Running Workflow..." : "▶ Run Workflow"}
        </button>
      </div>

      {logs.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Workflow Logs</h3>
          <pre
            style={{
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              padding: "1rem",
              borderRadius: "8px",
              overflow: "auto",
              maxHeight: "400px",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
          >
            {logs.join("\n")}
          </pre>
        </div>
      )}

      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
        <h3>⚠️ Note: Sprint 1 Prototype</h3>
        <p>This is a <strong>minimal prototype</strong> to prove Option A architecture works.</p>
        <p><strong>Expected behavior:</strong></p>
        <ul>
          <li>API calls may fail (CORS, auth, endpoints not ready) - that's OK!</li>
          <li>The goal is to prove the <em>integration pattern</em> works</li>
          <li>Error messages should show proper auth headers, request structure, etc.</li>
        </ul>
        <p><strong>Success criteria:</strong></p>
        <ul>
          <li>✅ Access token retrieved from session</li>
          <li>✅ API client factory works (from shared package)</li>
          <li>✅ API requests are properly formatted</li>
        </ul>
      </div>
    </div>
  );
}